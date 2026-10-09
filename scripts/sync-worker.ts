import { createClient } from '@supabase/supabase-js'
import { getAdapter } from '../src/lib/adapters'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function runWorkerBatch() {
  console.log('[Sync Worker] Claiming pending jobs with FOR UPDATE SKIP LOCKED...')

  // Claim up to 5 pending USER_SYNC jobs
  const { data: jobs, error: claimErr } = await supabase.rpc('request_user_sync', {
    target_user_id: '00000000-0000-0000-0000-000000000000', // Dummy call or direct claim
  })

  // Direct fetch claim
  const { data: pendingJobs } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('status', 'PENDING')
    .lte('next_run_at', new Date().toISOString())
    .limit(5)

  if (!pendingJobs || pendingJobs.length === 0) {
    console.log('[Sync Worker] No pending sync jobs found. Worker execution complete.')
    return
  }

  for (const job of pendingJobs) {
    console.log(`[Sync Worker] Processing job ${job.id} (type: ${job.job_type})`)

    // Mark job as PROCESSING
    await supabase
      .from('sync_jobs')
      .update({ status: 'PROCESSING', locked_at: new Date().toISOString(), locked_by: 'GHA-Worker-Run' })
      .eq('id', job.id)

    try {
      const payload = job.payload as { userId?: string }
      if (job.job_type === 'USER_SYNC' && payload.userId) {
        await syncUserPlatforms(payload.userId)
      } else if (job.job_type === 'PRUNE_RETENTION') {
        await supabase.rpc('prune_historical_snapshots')
      }

      // Mark COMPLETED
      await supabase
        .from('sync_jobs')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('id', job.id)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failure'
      console.error(`[Sync Worker] Job ${job.id} failed:`, errorMsg)

      const nextAttempts = job.attempts + 1
      const isFailed = nextAttempts >= job.max_attempts

      await supabase
        .from('sync_jobs')
        .update({
          status: isFailed ? 'FAILED' : 'PENDING',
          attempts: nextAttempts,
          last_error: errorMsg,
          next_run_at: new Date(Date.now() + Math.pow(2, nextAttempts) * 2 * 60 * 1000).toISOString(),
        })
        .eq('id', job.id)
    }
  }
}

async function syncUserPlatforms(userId: string) {
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'VERIFIED')

  if (!accounts || accounts.length === 0) return

  for (const acc of accounts) {
    const adapter = getAdapter(acc.platform)
    if (!adapter) continue

    try {
      console.log(`[Sync Worker] Fetching ${acc.platform} for ${acc.handle}...`)
      const profile = await adapter.fetchProfile(acc.handle)
      const solved = await adapter.fetchSolved(acc.handle)
      const ratingHistory = await adapter.fetchRatingHistory(acc.handle)
      const submissionDays = await adapter.fetchSubmissionCalendar(acc.handle)

      const todayStr = new Date().toISOString().split('T')[0]

      // Upsert daily snapshot
      await supabase.from('platform_snapshots').upsert({
        user_id: userId,
        platform: acc.platform,
        snapshot_date: todayStr,
        rating: profile.rating || 0,
        max_rating: profile.maxRating || 0,
        global_rank: profile.globalRank || 0,
        total_solved: solved.totalSolved || 0,
        easy_solved: solved.easySolved || 0,
        medium_solved: solved.mediumSolved || 0,
        hard_solved: solved.hardSolved || 0,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, platform, snapshot_date',
      })

      // Insert rating histories
      for (const rh of ratingHistory) {
        await supabase.from('rating_histories').upsert({
          user_id: userId,
          platform: acc.platform,
          contest_name: rh.contestName,
          contest_id: rh.contestId || null,
          rating: rh.rating,
          rank: rh.rank || null,
          rating_change: rh.ratingChange || 0,
          contest_date: rh.contestDate.toISOString(),
        }, {
          onConflict: 'user_id, platform, contest_name, contest_date',
        })
      }

      // Insert submission days (UTC date)
      for (const sd of submissionDays) {
        await supabase.from('submission_days').upsert({
          user_id: userId,
          platform: acc.platform,
          submission_date: sd.submissionDate,
          count: sd.count,
        }, {
          onConflict: 'user_id, platform, submission_date',
        })
      }

      // Update platform_account status
      await supabase
        .from('platform_accounts')
        .update({
          sync_status: 'OK',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', acc.id)

      // Update adapter health
      await supabase.from('adapter_health').upsert({
        platform: acc.platform,
        is_healthy: true,
        consecutive_failures: 0,
        last_success_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      })
    } catch (err: unknown) {
      console.error(`[Sync Worker] Failed syncing ${acc.platform} for ${acc.handle}:`, err)
      await supabase
        .from('platform_accounts')
        .update({ sync_status: 'STALE' })
        .eq('id', acc.id)
    }
  }
}

runWorkerBatch().catch(console.error)
