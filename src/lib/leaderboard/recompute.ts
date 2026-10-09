import { createAdminClient } from '@/lib/supabase/admin'

export async function recomputeLeaderboardCache() {
  const adminClient = createAdminClient()

  // 1. Fetch active score config
  const { data: config } = await adminClient
    .from('score_configs')
    .select('*')
    .eq('is_active', true)
    .single()

  const wSolved = config?.weight_problems_solved || 0.35
  const wCf = config?.weight_cf_rating || 0.20
  const wLc = config?.weight_lc_rating || 0.20
  const wCc = config?.weight_cc_rating || 0.10
  const wStreak = config?.weight_streak || 0.05

  // 2. Fetch all active student profiles
  const { data: students } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'STUDENT')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (!students || students.length === 0) return

  // 3. Fetch snapshots
  const { data: snapshots } = await adminClient
    .from('platform_snapshots')
    .select('*')

  const userStatsMap = new Map<string, { totalSolved: number; cfRating: number; lcRating: number; ccRating: number }>()

  for (const s of snapshots || []) {
    const prev = userStatsMap.get(s.user_id) || { totalSolved: 0, cfRating: 0, lcRating: 0, ccRating: 0 }
    if (s.platform === 'codeforces') prev.cfRating = Math.max(prev.cfRating, s.rating || 0)
    if (s.platform === 'leetcode') prev.lcRating = Math.max(prev.lcRating, s.rating || 0)
    if (s.platform === 'codechef') prev.ccRating = Math.max(prev.ccRating, s.rating || 0)
    prev.totalSolved += s.total_solved || 0
    userStatsMap.set(s.user_id, prev)
  }

  // Calculate composite score per student
  const studentScores = students.map((st) => {
    const stats = userStatsMap.get(st.id) || { totalSolved: 0, cfRating: 0, lcRating: 0, ccRating: 0 }
    const solvedScore = stats.totalSolved * 2.5
    const overallScore = Math.round(
      solvedScore * wSolved +
      stats.cfRating * wCf +
      stats.lcRating * wLc +
      stats.ccRating * wCc
    )

    return {
      userId: st.id,
      rollNumber: st.roll_number || 'N/A',
      name: st.name,
      department: st.department,
      section: st.section,
      batchYear: st.batch_year,
      totalSolved: stats.totalSolved,
      overallScore,
    }
  })

  // Sort by overall score descending
  studentScores.sort((a, b) => b.overallScore - a.overallScore)

  // Clear existing cache for OVERALL scope
  await adminClient.from('leaderboard_cache').delete().eq('scope', 'OVERALL')

  // Insert cache rows
  const cacheRows = studentScores.map((st, idx) => ({
    scope: 'OVERALL',
    filter_time: 'ALL_TIME',
    department: st.department,
    section: st.section,
    batch_year: st.batchYear,
    rank: idx + 1,
    user_id: st.userId,
    roll_number: st.rollNumber,
    student_name: st.name,
    total_solved: st.totalSolved,
    rating_score: st.overallScore,
    overall_score: st.overallScore,
    rank_change_week: 0,
    computed_at: new Date().toISOString(),
  }))

  if (cacheRows.length > 0) {
    await adminClient.from('leaderboard_cache').insert(cacheRows)
  }
}
