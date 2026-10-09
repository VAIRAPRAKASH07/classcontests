import { describe, it, expect } from 'vitest'
import { computeStudentMetrics } from '@/lib/dashboard/student-metrics'

describe('Phase 4: Student Dashboard Metrics & Streak Calculation Tests', () => {
  it('should calculate active days and UTC streak correctly', () => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]

    const mockSubmissionDays: any[] = [
      { submission_date: today, count: 5 },
      { submission_date: yesterday, count: 3 },
      { submission_date: twoDaysAgo, count: 8 },
    ]

    const res = computeStudentMetrics([], [], mockSubmissionDays)
    expect(res.activeDays).toBe(3)
    expect(res.currentStreak).toBe(3)
    expect(res.maxStreak).toBe(3)
  })

  it('should aggregate total, easy, medium, and hard solved counts across platform snapshots', () => {
    const mockSnapshots: any[] = [
      { platform: 'leetcode', total_solved: 150, easy_solved: 70, medium_solved: 60, hard_solved: 20, rating: 1750 },
      { platform: 'codeforces', total_solved: 80, easy_solved: 40, medium_solved: 30, hard_solved: 10, rating: 1420 },
    ]

    const res = computeStudentMetrics(mockSnapshots, [], [])
    expect(res.totalSolved).toBe(230)
    expect(res.easySolved).toBe(110)
    expect(res.mediumSolved).toBe(90)
    expect(res.hardSolved).toBe(30)
    expect(res.platformMetrics.leetcode.rating).toBe(1750)
    expect(res.platformMetrics.codeforces.rating).toBe(1420)
  })
})
