import { Database } from '@/types/database.types'

type SnapshotRow = Database['public']['Tables']['platform_snapshots']['Row']
type RatingRow = Database['public']['Tables']['rating_histories']['Row']
type SubmissionDayRow = Database['public']['Tables']['submission_days']['Row']

export interface DashboardMetrics {
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  activeDays: number
  currentStreak: number
  maxStreak: number
  totalContests: number
  heatmap: Record<string, number> // YYYY-MM-DD -> total count
  platformMetrics: Record<string, {
    rating: number
    maxRating: number
    solved: number
    easy: number
    medium: number
    hard: number
    rank: number
  }>
}

export function computeStudentMetrics(
  snapshots: SnapshotRow[],
  ratingHistory: RatingRow[],
  submissionDays: SubmissionDayRow[]
): DashboardMetrics {
  let totalSolved = 0
  let easySolved = 0
  let mediumSolved = 0
  let hardSolved = 0

  const platformMetrics: Record<string, any> = {}

  // Latest snapshot per platform
  const latestByPlatform = new Map<string, SnapshotRow>()
  for (const s of snapshots) {
    if (!latestByPlatform.has(s.platform)) {
      latestByPlatform.set(s.platform, s)
    }
  }

  latestByPlatform.forEach((s, p) => {
    totalSolved += s.total_solved || 0
    easySolved += s.easy_solved || 0
    mediumSolved += s.medium_solved || 0
    hardSolved += s.hard_solved || 0

    platformMetrics[p] = {
      rating: s.rating || 0,
      maxRating: s.max_rating || 0,
      solved: s.total_solved || 0,
      easy: s.easy_solved || 0,
      medium: s.medium_solved || 0,
      hard: s.hard_solved || 0,
      rank: s.global_rank || 0,
    }
  })

  // Heatmap aggregation
  const heatmap: Record<string, number> = {}
  for (const sd of submissionDays) {
    heatmap[sd.submission_date] = (heatmap[sd.submission_date] || 0) + sd.count
  }

  const activeDays = Object.keys(heatmap).length

  // Streak Calculation (UTC Calendar Date)
  const sortedDates = Object.keys(heatmap).sort().reverse()
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0

  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let checkDate = new Date(sortedDates[0])
    // If top date is today or yesterday, streak is active
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      tempStreak = 1
      let curr = checkDate

      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i])
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24))
        if (diffDays === 1) {
          tempStreak++
          curr = prev
        } else if (diffDays > 1) {
          break
        }
      }
      currentStreak = tempStreak
    }

    // Historical max streak calculation
    let runStreak = 1
    maxStreak = 1
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const d1 = new Date(sortedDates[i])
      const d2 = new Date(sortedDates[i + 1])
      const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24))
      if (diffDays === 1) {
        runStreak++
        if (runStreak > maxStreak) maxStreak = runStreak
      } else {
        runStreak = 1
      }
    }
  }

  return {
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    activeDays,
    currentStreak,
    maxStreak,
    totalContests: ratingHistory.length,
    heatmap,
    platformMetrics,
  }
}
