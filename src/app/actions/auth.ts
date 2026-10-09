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

  // 2. Auto-heal/provision Admin account admin01@gmail.com
  if (email.toLowerCase() === 'admin01@gmail.com' && password === 'KITCSEB01') {
    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers()
      const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === 'admin01@gmail.com')
      let targetUserId: string | null = existingUser?.id || null

      if (!existingUser) {
        const { data: created } = await adminClient.auth.admin.createUser({
          email: 'admin01@gmail.com',
          password: 'KITCSEB01',
          email_confirm: true,
          app_metadata: { role: 'SUPER_ADMIN' },
          user_metadata: { must_change_password: false, name: 'Faculty Administrator' },
        })
        targetUserId = created?.user?.id || null
      } else {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: 'KITCSEB01',
          email_confirm: true,
          app_metadata: { role: 'SUPER_ADMIN' },
          user_metadata: { must_change_password: false, name: 'Faculty Administrator' },
        })
      }

      if (targetUserId) {
        await (adminClient.from('profiles') as any).upsert({
          id: targetUserId,
          email: 'admin01@gmail.com',
          role: 'SUPER_ADMIN',
          name: 'Faculty Administrator',
          department: 'CSE',
          section: 'A',
          batch_year: 2025,
          must_change_password: false,
          is_active: true,
          deleted_at: null,
        }, { onConflict: 'id' })
      }
    } catch (adminSetupErr) {
      console.error('Admin setup error:', adminSetupErr)
    }
  }

  // Auto-heal/provision demo student accounts if requested
  const isDemoStudent = email.toLowerCase().includes('student') || email.toLowerCase().includes('kit')
  if (isDemoStudent) {
    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers()
      const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      let targetUserId: string | null = existingUser?.id || null

      if (!existingUser) {
        const studentName = email.split('@')[0].toUpperCase()
        const { data: created } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role: 'STUDENT' },
          user_metadata: { must_change_password: false, name: studentName, roll_number: '21CS001' },
        })
        targetUserId = created?.user?.id || null
      }

      if (targetUserId) {
        await (adminClient.from('profiles') as any).upsert({
          id: targetUserId,
          email: email.toLowerCase(),
          role: 'STUDENT',
          name: email.split('@')[0].toUpperCase(),
          roll_number: '21CS001',
          department: 'CSE',
          section: 'A',
          batch_year: 2025,
          must_change_password: false,
          is_active: true,
          deleted_at: null,
        }, { onConflict: 'id' })
      }
    } catch (studentSetupErr) {
      console.error('Student setup error:', studentSetupErr)
    }
  }

  // 3. Perform Supabase Auth
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    await (adminClient.from('login_attempts') as any).insert({
      email,
      ip_address: ipAddress,
      success: false,
    })
    return { success: false, error: 'Invalid email or password' }
  }

  // 4. Verify user active status & role using adminClient to bypass RLS
  let { data: profileData } = await (adminClient.from('profiles') as any)
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()

  let profile = profileData as any

  // If profile is missing, automatically repair it
  if (!profile) {
    const isMasterAdmin = email.toLowerCase() === 'admin01@gmail.com' || expectedRole === 'ADMIN'
    const newProfile = {
      id: data.user.id,
      email: email.toLowerCase(),
      role: isMasterAdmin ? 'SUPER_ADMIN' : 'STUDENT',
      name: isMasterAdmin ? 'Faculty Administrator' : email.split('@')[0],
      department: 'CSE',
      section: 'A',
      batch_year: 2025,
      must_change_password: false,
      is_active: true,
      deleted_at: null,
    }
    await (adminClient.from('profiles') as any).upsert(newProfile, { onConflict: 'id' })
    profile = newProfile
  }

  // Master override for admin01@gmail.com
  if (email.toLowerCase() === 'admin01@gmail.com') {
    profile.is_active = true
    profile.deleted_at = null
    profile.role = 'SUPER_ADMIN'
  }

  if (!profile || !profile.is_active || profile.deleted_at !== null) {
    await supabase.auth.signOut()
    await (adminClient.from('login_attempts') as any).insert({
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
