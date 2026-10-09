import {
  PlatformAdapter,
  ProfileData,
  SolvedMetrics,
  RatingEvent,
  SubmissionDayItem,
  ContestItem,
  VerificationResult,
} from './types'

export class CodeforcesAdapter implements PlatformAdapter {
  platformKey = 'codeforces'
  platformName = 'Codeforces'

  async validateHandle(handle: string, expectedToken?: string): Promise<VerificationResult> {
    try {
      const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
        headers: { 'User-Agent': 'ClassCodeTracker/1.0' },
      })

      if (!res.ok) {
        return { valid: false, tokenFound: false, error: 'Codeforces handle not found' }
      }

      const data = await res.json()
      if (data.status !== 'OK' || !data.result || data.result.length === 0) {
        return { valid: false, tokenFound: false, error: 'User does not exist on Codeforces' }
      }

      const user = data.result[0]
      let tokenFound = false

      if (expectedToken) {
        const searchBio = `${user.firstName || ''} ${user.lastName || ''} ${user.organization || ''}`.toLowerCase()
        tokenFound = searchBio.includes(expectedToken.toLowerCase())
      } else {
        tokenFound = true
      }

      return { valid: true, tokenFound }
    } catch (err: unknown) {
      return { valid: false, tokenFound: false, error: err instanceof Error ? err.message : 'Fetch error' }
    }
  }

  async fetchProfile(handle: string): Promise<ProfileData> {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`)
    const data = await res.json()
    if (data.status !== 'OK' || !data.result?.[0]) {
      throw new Error(`Codeforces user ${handle} not found`)
    }
    const u = data.result[0]

    return {
      handle: u.handle,
      platform: this.platformKey,
      avatarUrl: u.titlePhoto || u.avatar,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.handle,
      organization: u.organization,
      globalRank: u.maxRank ? undefined : undefined,
      rating: u.rating || 0,
      maxRating: u.maxRating || 0,
      tierName: u.rank || 'unrated',
    }
  }

  async fetchSolved(handle: string): Promise<SolvedMetrics> {
    const res = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=2000`)
    const data = await res.json()
    if (data.status !== 'OK') {
      return { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 }
    }

    const solvedProblems = new Set<string>()
    let easy = 0
    let medium = 0
    let hard = 0

    for (const sub of data.result) {
      if (sub.verdict === 'OK' && sub.problem) {
        const problemId = `${sub.problem.contestId}-${sub.problem.index}`
        if (!solvedProblems.has(problemId)) {
          solvedProblems.add(problemId)
          const rating = sub.problem.rating || 1200
          if (rating < 1400) easy++
          else if (rating < 1900) medium++
          else hard++
        }
      }
    }

    return {
      totalSolved: solvedProblems.size,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
      totalSubmissions: data.result.length,
    }
  }

  async fetchRatingHistory(handle: string): Promise<RatingEvent[]> {
    const res = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`)
    const data = await res.json()
    if (data.status !== 'OK') return []

    return data.result.map((item: any) => ({
      contestName: item.contestName,
      contestId: item.contestId?.toString(),
      rating: item.newRating,
      rank: item.rank,
      ratingChange: item.newRating - item.oldRating,
      contestDate: new Date(item.ratingUpdateTimeSeconds * 1000),
    }))
  }

  async fetchSubmissionCalendar(handle: string): Promise<SubmissionDayItem[]> {
    const res = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=2000`)
    const data = await res.json()
    if (data.status !== 'OK') return []

    const dateMap = new Map<string, number>()

    for (const sub of data.result) {
      if (sub.creationTimeSeconds) {
        const dateStr = new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0]
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
      }
    }

    return Array.from(dateMap.entries()).map(([submissionDate, count]) => ({
      submissionDate,
      count,
    }))
  }

  async fetchContests(): Promise<ContestItem[]> {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false')
    const data = await res.json()
    if (data.status !== 'OK') return []

    return data.result
      .filter((c: any) => c.phase === 'BEFORE' || c.phase === 'CODING')
      .map((c: any) => ({
        platform: this.platformKey,
        name: c.name,
        url: `https://codeforces.com/contests/${c.id}`,
        startTime: new Date(c.startTimeSeconds * 1000),
        endTime: new Date((c.startTimeSeconds + c.durationSeconds) * 1000),
        durationSeconds: c.durationSeconds,
        phase: c.phase === 'CODING' ? 'CODING' : 'BEFORE',
      }))
  }
}
