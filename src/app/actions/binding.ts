'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdapter } from '@/lib/adapters'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function actionSubmitHandle(platform: string, handle: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthenticated' }

    const cleanHandle = handle.trim()
    if (!cleanHandle) return { success: false, error: 'Handle cannot be empty' }

    const adapter = getAdapter(platform)
    if (!adapter) return { success: false, error: `Unsupported platform: ${platform}` }

    const adminClient = createAdminClient()

    // 1. Verify handle exists on platform
    const validCheck = await adapter.validateHandle(cleanHandle)
    if (!validCheck.valid) {
      return { success: false, error: validCheck.error || `Handle '${cleanHandle}' does not exist on ${adapter.platformName}` }
    }

    // 2. Check partial unique index for existing VERIFIED claim
    const { data: existingVerified, error: checkErr } = await (adminClient.from('platform_accounts') as any)
      .select('user_id')
      .eq('platform', platform)
      .eq('handle', cleanHandle)
      .eq('status', 'VERIFIED')
      .maybeSingle()

    if (checkErr && checkErr.message.includes('schema cache')) {
      return {
        success: false,
        error: 'Database tables not initialized in Supabase yet. Please run the SQL migration in Supabase SQL Editor.',
      }
    }

    if (existingVerified && existingVerified.user_id !== user.id) {
      return { success: false, error: `Handle '${cleanHandle}' is already verified by another student account.` }
    }

    // 3. Generate random verification token (cct-8hex)
    const randomHex = crypto.randomBytes(4).toString('hex')
    const verifyToken = `cct-${randomHex}`

    // 4. Upsert platform account in PENDING state using adminClient to bypass RLS
    const { error: upsertErr } = await (adminClient.from('platform_accounts') as any).upsert({
      user_id: user.id,
      platform,
      handle: cleanHandle,
      status: 'PENDING',
      verify_token: verifyToken,
      verified_at: null,
      sync_status: 'STALE',
    }, {
      onConflict: 'user_id, platform',
    })

    if (upsertErr) {
      if (upsertErr.message.includes('schema cache')) {
        return {
          success: false,
          error: 'Database tables not initialized in Supabase yet. Please run the SQL migration in Supabase SQL Editor.',
        }
      }
      return { success: false, error: upsertErr.message }
    }

    revalidatePath('/accounts')
    return {
      success: true,
      verifyToken,
      message: `Handle submitted! Place token '${verifyToken}' in your ${adapter.platformName} profile Bio/Name and click Verify.`,
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Submit failed' }
  }
}

export async function actionVerifyHandle(platform: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthenticated' }

    const adminClient = createAdminClient()

    const { data: account, error: fetchErr } = await (adminClient.from('platform_accounts') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .maybeSingle()

    if (fetchErr && fetchErr.message.includes('schema cache')) {
      return {
        success: false,
        error: 'Database tables not initialized in Supabase yet. Please run the SQL migration in Supabase SQL Editor.',
      }
    }

    if (!account) return { success: false, error: 'No account binding found for this platform' }
    if (account.status === 'VERIFIED') return { success: true, message: 'Account is already verified!' }

    const adapter = getAdapter(platform)
    if (!adapter) return { success: false, error: 'Unsupported platform' }

    // Check bio for verify_token
    const checkResult = await adapter.validateHandle(account.handle, account.verify_token)
    if (!checkResult.tokenFound) {
      return {
        success: false,
        error: `Verification token '${account.verify_token}' not found in your ${adapter.platformName} Bio/About/Name. Please add it and try again.`,
      }
    }

    // Token verified! Update status
    const { error: updateErr } = await (adminClient.from('platform_accounts') as any)
      .update({
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        sync_status: 'STALE',
      })
      .eq('id', account.id)

    if (updateErr) return { success: false, error: updateErr.message }

    // Enqueue initial sync job via RPC if RPC exists
    try {
      await supabase.rpc('request_user_sync', { target_user_id: user.id })
    } catch {
      // Ignore RPC error if not deployed
    }

    revalidatePath('/accounts')
    return { success: true, message: `Congratulations! Your ${adapter.platformName} handle '${account.handle}' is verified!` }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Verification failed' }
  }
}

export async function actionUnbindHandle(platform: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthenticated' }

    const adminClient = createAdminClient()

    const { error } = await (adminClient.from('platform_accounts') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform)

    if (error) return { success: false, error: error.message }

    revalidatePath('/accounts')
    return { success: true, message: 'Platform account unbound successfully' }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unbind failed' }
  }
}
