import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seedData() {
  console.log('[Seed Script] Seeding 2 Faculty Admins + 20 Student Profiles with realistic competitive statistics...')

  // 1. Create Admins
  const admins = [
    { email: 'admin01@gmail.com', name: 'Faculty Administrator', role: 'SUPER_ADMIN', password: 'KITCSEB01' },
    { email: 'admin@institution.ac.in', name: 'Dr. Ramesh Kumar', role: 'ADMIN', password: 'AdminPassword#2025' },
  ]

  for (const adm of admins) {
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: adm.email,
      password: adm.password,
      email_confirm: true,
      app_metadata: { role: adm.role },
      user_metadata: { must_change_password: false, name: adm.name },
    })

    if (authUser?.user) {
      await supabase.from('profiles').upsert({
        id: authUser.user.id,
        email: adm.email,
        role: adm.role as any,
        name: adm.name,
        department: 'CSE',
        section: 'A',
        batch_year: 2025,
        must_change_password: false,
        is_active: true,
      })
    }
  }

  // 2. Create 20 Demo Students
  const departments = ['CSE', 'IT', 'ECE']
  const sections = ['A', 'B']

  for (let i = 1; i <= 20; i++) {
    const rollNumber = `21CS0${i < 10 ? '0' + i : i}`
    const email = `student${i}@institution.ac.in`
    const name = `Student ${i} Kumar`
    const dept = departments[i % 3]
    const sec = sections[i % 2]

    const { data: authUser } = await supabase.auth.admin.createUser({
      email,
      password: 'StudentPassword#2025',
      email_confirm: true,
      app_metadata: { role: 'STUDENT' },
      user_metadata: { must_change_password: false, name, roll_number: rollNumber },
    })

    if (authUser?.user) {
      const userId = authUser.user.id

      await supabase.from('profiles').upsert({
        id: userId,
        email,
        role: 'STUDENT',
        name,
        roll_number: rollNumber,
        department: dept,
        section: sec,
        batch_year: 2025,
        must_change_password: false,
        is_active: true,
      })

      // Bind LeetCode & Codeforces
      await supabase.from('platform_accounts').upsert({
        user_id: userId,
        platform: 'leetcode',
        handle: `student_${i}_lc`,
        status: 'VERIFIED',
        verify_token: `cct-seed-${i}`,
        verified_at: new Date().toISOString(),
        sync_status: 'OK',
      })

      await supabase.from('platform_accounts').upsert({
        user_id: userId,
        platform: 'codeforces',
        handle: `student_${i}_cf`,
        status: 'VERIFIED',
        verify_token: `cct-seed-cf-${i}`,
        verified_at: new Date().toISOString(),
        sync_status: 'OK',
      })

      // Snapshots
      const solved = 50 + i * 20
      await supabase.from('platform_snapshots').upsert({
        user_id: userId,
        platform: 'leetcode',
        snapshot_date: new Date().toISOString().split('T')[0],
        rating: 1400 + i * 25,
        max_rating: 1450 + i * 25,
        total_solved: Math.round(solved * 0.6),
        easy_solved: Math.round(solved * 0.3),
        medium_solved: Math.round(solved * 0.2),
        hard_solved: Math.round(solved * 0.1),
      }, { onConflict: 'user_id, platform, snapshot_date' })

      await supabase.from('platform_snapshots').upsert({
        user_id: userId,
        platform: 'codeforces',
        snapshot_date: new Date().toISOString().split('T')[0],
        rating: 1200 + i * 30,
        max_rating: 1250 + i * 30,
        total_solved: Math.round(solved * 0.4),
        easy_solved: Math.round(solved * 0.2),
        medium_solved: Math.round(solved * 0.15),
        hard_solved: Math.round(solved * 0.05),
      }, { onConflict: 'user_id, platform, snapshot_date' })
    }
  }

  console.log('[Seed Script] Seeding complete! 2 Admins + 20 Students populated successfully.')
}

seedData().catch(console.error)
