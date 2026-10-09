'use me' // Server Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid Gmail address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  expectedRole: z.enum(['STUDENT', 'ADMIN']),
})

export async function actionSignIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const expectedRole = (formData.get('expectedRole') as 'STUDENT' | 'ADMIN') || 'STUDENT'

  const validation = signInSchema.safeParse({ email, password, expectedRole })
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const reqHeaders = await headers()
  const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

  const adminClient = createAdminClient()

  // 1. Pre-auth rate limit check against login_attempts table
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count: failedCount } = await adminClient
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', fifteenMinutesAgo)

  if (failedCount && failedCount >= 5) {
    return {
      success: false,
      error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.',
    }
  }

  // 2. Perform Supabase Auth
  const supabase = await createClient()
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Auto-provision default admin if not created yet in Supabase Cloud DB
  if ((error || !data.user) && email.toLowerCase() === 'admin01@gmail.com' && password === 'KITCSEB01') {
    try {
      const { data: newAuth } = await adminClient.auth.admin.createUser({
        email: 'admin01@gmail.com',
        password: 'KITCSEB01',
        email_confirm: true,
        app_metadata: { role: 'SUPER_ADMIN' },
        user_metadata: { must_change_password: false, name: 'Faculty Administrator' },
      })

      if (newAuth?.user) {
        await (adminClient.from('profiles') as any).upsert({
          id: newAuth.user.id,
          email: 'admin01@gmail.com',
          role: 'SUPER_ADMIN',
          name: 'Faculty Administrator',
          department: 'CSE',
          section: 'A',
          batch_year: 2025,
          must_change_password: false,
          is_active: true,
        })

        const retry = await supabase.auth.signInWithPassword({
          email: 'admin01@gmail.com',
          password: 'KITCSEB01',
        })
        data = retry.data
        error = retry.error
      }
    } catch (provisionErr) {
      console.error('Auto-provisioning admin error:', provisionErr)
    }
  }

  // Auto-provision demo student if requested
  if ((error || !data.user) && email.toLowerCase() === 'student1@institution.ac.in') {
    try {
      const { data: newAuth } = await adminClient.auth.admin.createUser({
        email: 'student1@institution.ac.in',
        password,
        email_confirm: true,
        app_metadata: { role: 'STUDENT' },
        user_metadata: { must_change_password: false, name: 'Demo Student 1', roll_number: '21CS001' },
      })

      if (newAuth?.user) {
        await (adminClient.from('profiles') as any).upsert({
          id: newAuth.user.id,
          email: 'student1@institution.ac.in',
          role: 'STUDENT',
          name: 'Demo Student 1',
          roll_number: '21CS001',
          department: 'CSE',
          section: 'A',
          batch_year: 2025,
          must_change_password: false,
          is_active: true,
        })

        const retry = await supabase.auth.signInWithPassword({
          email: 'student1@institution.ac.in',
          password,
        })
        data = retry.data
        error = retry.error
      }
    } catch (provisionErr) {
      console.error('Auto-provisioning student error:', provisionErr)
    }
  }

  if (error || !data.user) {
    // Record failed attempt
    await (adminClient.from('login_attempts') as any).insert({
      email,
      ip_address: ipAddress,
      success: false,
    })
    return { success: false, error: 'Invalid email or password' }
  }

  // 3. Verify user active status & role from database profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  const profile = profileData as any

  if (!profile || !profile.is_active || profile.deleted_at !== null) {
    await supabase.auth.signOut()
    await adminClient.from('login_attempts').insert({
      email,
      ip_address: ipAddress,
      success: false,
    })
    return { success: false, error: 'Account is deactivated or deleted. Contact administrator.' }
  }

  // Role isolation verification
  const isUserAdmin = profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN'
  if (expectedRole === 'ADMIN' && !isUserAdmin) {
    await supabase.auth.signOut()
    await adminClient.from('login_attempts').insert({
      email,
      ip_address: ipAddress,
      success: false,
    })
    return { success: false, error: 'Unauthorized: Student accounts cannot log in via Admin portal.' }
  }

  if (expectedRole === 'STUDENT' && isUserAdmin) {
    // Faculty can sign in via student portal if intended, but let's encourage proper portal tab
  }

  // Record successful login attempt
  await adminClient.from('login_attempts').insert({
    email,
    ip_address: ipAddress,
    success: true,
  })

  // Check if forced password change is required
  if (profile.must_change_password) {
    redirect('/force-change-password')
  }

  const destination = isUserAdmin ? '/admin' : '/dashboard'
  redirect(destination)
}

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function actionForceChangePassword(formData: FormData) {
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  const validation = passwordSchema.safeParse({ newPassword, confirmPassword })
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 1. Update password & clear must_change_password in user_metadata
  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  // 2. Clear must_change_password in profiles table using admin client (bypassing student update restriction)
  const adminClient = createAdminClient()
  await adminClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  const { data: profData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profData as any
  const isUserAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'

  redirect(isUserAdmin ? '/admin' : '/dashboard')
}

export async function actionSignOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
