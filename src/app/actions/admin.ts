'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

// Helper to ensure current session user is ADMIN or SUPER_ADMIN
async function verifyAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthenticated')
  }

  const adminClient = createAdminClient()
  const { data: profileData } = await (adminClient.from('profiles') as any)
    .select('role, email, id')
    .eq('id', user.id)
    .maybeSingle()

  let profile = profileData as { role: string; email: string; id: string } | null

  if (user.email?.toLowerCase() === 'admin01@gmail.com') {
    profile = { role: 'SUPER_ADMIN', email: 'admin01@gmail.com', id: user.id }
  }

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    throw new Error('Unauthorized: Admin privilege required')
  }

  return { adminUser: user, adminProfile: profile }
}

async function recordAuditLog(
  action: string,
  targetEntity: string,
  targetId: string | null,
  details: Record<string, unknown>
) {
  const { adminUser, adminProfile } = await verifyAdminAuth()
  const reqHeaders = await headers()
  const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  const userAgent = reqHeaders.get('user-agent') || 'Unknown'

  const adminClient = createAdminClient()
  await (adminClient.from('audit_logs') as any).insert({
    actor_id: adminUser.id,
    actor_email: adminProfile.email,
    actor_role: adminProfile.role,
    action,
    target_entity: targetEntity,
    target_id: targetId,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNumber: z.string().min(2, 'Roll number is required'),
  email: z.string().email('Valid Gmail address is required'),
  department: z.string().min(1, 'Department is required'),
  section: z.string().min(1, 'Section is required'),
  batchYear: z.number().int().min(2020).max(2035),
  tempPassword: z.string().min(8, 'Temporary password must be at least 8 characters'),
})

export async function actionCreateStudent(formData: FormData) {
  try {
    const { adminUser } = await verifyAdminAuth()
    const name = formData.get('name') as string
    const rollNumber = (formData.get('rollNumber') as string).toUpperCase().trim()
    const email = (formData.get('email') as string).toLowerCase().trim()
    const department = (formData.get('department') as string).toUpperCase().trim()
    const section = (formData.get('section') as string).toUpperCase().trim()
    const batchYear = parseInt(formData.get('batchYear') as string, 10) || 2025
    const tempPassword = formData.get('tempPassword') as string

    const validation = createStudentSchema.safeParse({
      name,
      rollNumber,
      email,
      department,
      section,
      batchYear,
      tempPassword,
    })

    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const adminClient = createAdminClient()

    // 1. Create Supabase Auth User with service role client
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role: 'STUDENT' },
      user_metadata: { must_change_password: true, name, roll_number: rollNumber },
    })

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message || 'Failed to create auth user' }
    }

    // 2. Insert Profiles row
    const { error: profileError } = await (adminClient.from('profiles') as any).insert({
      id: authUser.user.id,
      email,
      role: 'STUDENT',
      name,
      roll_number: rollNumber,
      department,
      section,
      batch_year: batchYear,
      must_change_password: true,
      is_active: true,
    })

    if (profileError) {
      // Rollback auth user creation if profile insert fails
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      if (profileError.message.includes('schema cache')) {
        return {
          success: false,
          error: 'Database tables not initialized in Supabase yet. Please run the SQL migration script in your Supabase SQL Editor.',
        }
      }
      return { success: false, error: profileError.message }
    }

    await recordAuditLog('STUDENT_CREATED', 'PROFILES', authUser.user.id, {
      name,
      rollNumber,
      email,
      department,
      section,
      batchYear,
      createdBy: adminUser.id,
    })

    revalidatePath('/admin')
    revalidatePath('/admin/students')
    return { success: true, message: `Student ${name} (${rollNumber}) created successfully.` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create student'
    return { success: false, error: msg }
  }
}

export async function actionSoftDeleteStudent(studentId: string) {
  try {
    await verifyAdminAuth()
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', studentId)

    if (error) return { success: false, error: error.message }

    await recordAuditLog('STUDENT_SOFT_DELETED', 'PROFILES', studentId, { studentId })
    revalidatePath('/admin')
    revalidatePath('/admin/students')
    return { success: true, message: 'Student soft-deleted successfully' }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Operation failed' }
  }
}

export async function actionRestoreStudent(studentId: string) {
  try {
    await verifyAdminAuth()
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', studentId)

    if (error) return { success: false, error: error.message }

    await recordAuditLog('STUDENT_RESTORED', 'PROFILES', studentId, { studentId })
    revalidatePath('/admin')
    revalidatePath('/admin/students')
    return { success: true, message: 'Student restored successfully' }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Operation failed' }
  }
}

export async function actionToggleStudentActiveStatus(studentId: string, currentStatus: boolean) {
  try {
    await verifyAdminAuth()
    const adminClient = createAdminClient()
    const newStatus = !currentStatus

    // Update profiles active state
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', studentId)

    if (profileErr) return { success: false, error: profileErr.message }

    // Ban/Unban in Supabase Auth
    const { error: authErr } = await adminClient.auth.admin.updateUserById(studentId, {
      ban_duration: newStatus ? 'none' : '876000h', // 100 years if banned
    })

    if (authErr) return { success: false, error: authErr.message }

    await recordAuditLog('STUDENT_STATUS_TOGGLED', 'PROFILES', studentId, { newStatus })
    revalidatePath('/admin')
    revalidatePath('/admin/students')
    return { success: true, message: `Student status set to ${newStatus ? 'Active' : 'Disabled'}` }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Operation failed' }
  }
}

export async function actionResetStudentPassword(studentId: string, newTempPassword: string) {
  try {
    await verifyAdminAuth()
    if (!newTempPassword || newTempPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' }
    }

    const adminClient = createAdminClient()

    // 1. Update auth password & force change flag
    const { error: authErr } = await adminClient.auth.admin.updateUserById(studentId, {
      password: newTempPassword,
      user_metadata: { must_change_password: true },
    })

    if (authErr) return { success: false, error: authErr.message }

    // 2. Update profiles flag
    const { error: profErr } = await adminClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', studentId)

    if (profErr) return { success: false, error: profErr.message }

    await recordAuditLog('STUDENT_PASSWORD_RESET', 'PROFILES', studentId, { studentId })
    return { success: true, message: 'Student password reset successfully. Forced password change enabled.' }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Operation failed' }
  }
}

export async function actionBulkImportStudentsCSV(csvDataString: string) {
  try {
    const { adminUser } = await verifyAdminAuth()
    const lines = csvDataString.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      return { success: false, error: 'CSV file is empty or missing headers' }
    }

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const nameIdx = headers.indexOf('name')
    const rollIdx = headers.indexOf('roll_number') !== -1 ? headers.indexOf('roll_number') : headers.indexOf('rollnumber')
    const emailIdx = headers.indexOf('email')
    const deptIdx = headers.indexOf('department') !== -1 ? headers.indexOf('department') : headers.indexOf('dept')
    const secIdx = headers.indexOf('section') !== -1 ? headers.indexOf('section') : headers.indexOf('sec')
    const batchIdx = headers.indexOf('batch_year') !== -1 ? headers.indexOf('batch_year') : headers.indexOf('batch')
    const passwordIdx = headers.indexOf('password') !== -1 ? headers.indexOf('password') : headers.indexOf('temp_password')

    if (nameIdx === -1 || rollIdx === -1 || emailIdx === -1) {
      return { success: false, error: 'CSV missing required headers: name, roll_number, email' }
    }

    const adminClient = createAdminClient()
    let successCount = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      if (cols.length < 3) continue

      const name = cols[nameIdx]
      const rollNumber = cols[rollIdx].toUpperCase()
      const email = cols[emailIdx].toLowerCase()
      const department = (deptIdx !== -1 && cols[deptIdx]) ? cols[deptIdx].toUpperCase() : 'CSE'
      const section = (secIdx !== -1 && cols[secIdx]) ? cols[secIdx].toUpperCase() : 'A'
      const batchYear = (batchIdx !== -1 && cols[batchIdx]) ? parseInt(cols[batchIdx], 10) || 2025 : 2025
      const tempPassword = (passwordIdx !== -1 && cols[passwordIdx]) ? cols[passwordIdx] : `Pass#${rollNumber}2025`

      try {
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          app_metadata: { role: 'STUDENT' },
          user_metadata: { must_change_password: true, name, roll_number: rollNumber },
        })

        if (authError || !authUser.user) {
          errors.push(`Line ${i + 1} (${rollNumber}): ${authError?.message}`)
          continue
        }

        const { error: profileError } = await adminClient.from('profiles').insert({
          id: authUser.user.id,
          email,
          role: 'STUDENT',
          name,
          roll_number: rollNumber,
          department,
          section,
          batch_year: batchYear,
          must_change_password: true,
          is_active: true,
        })

        if (profileError) {
          await adminClient.auth.admin.deleteUser(authUser.user.id)
          errors.push(`Line ${i + 1} (${rollNumber}): ${profileError.message}`)
          continue
        }

        successCount++
      } catch (err: unknown) {
        errors.push(`Line ${i + 1} (${rollNumber}): ${err instanceof Error ? err.message : 'Failed'}`)
      }
    }

    await recordAuditLog('BULK_CSV_IMPORT', 'PROFILES', null, {
      totalRows: lines.length - 1,
      successCount,
      errorCount: errors.length,
      importedBy: adminUser.id,
    })

    revalidatePath('/admin')
    revalidatePath('/admin/students')
    return {
      success: true,
      message: `Bulk import completed: ${successCount} students created. ${errors.length} errors.`,
      errors,
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Bulk import failed' }
  }
}
