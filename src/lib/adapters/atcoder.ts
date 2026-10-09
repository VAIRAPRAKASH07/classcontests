import {
  PlatformAdapter,
  ProfileData,
  SolvedMetrics,
  RatingEvent,
  SubmissionDayItem,
  ContestItem,
  VerificationResult,
} from './types'

export class AtCoderAdapter implements PlatformAdapter {
  platformKey = 'atcoder'
  platformName = 'AtCoder'

  async validateHandle(handle: string, expectedToken?: string): Promise<VerificationResult> {
    try {
      const res = await fetch(`https://atcoder.jp/users/${encodeURIComponent(handle)}`)
      if (!res.ok) {
        return { valid: false, tokenFound: false, error: 'AtCoder handle not found' }
      }

      const html = await res.text()
      const tokenFound = expectedToken ? html.toLowerCase().includes(expectedToken.toLowerCase()) : true

      return { valid: true, tokenFound }
    } catch (err: unknown) {
      return { valid: false, tokenFound: false, error: err instanceof Error ? err.message : 'Fetch error' }
    }
  }

  async fetchProfile(handle: string): Promise<ProfileData> {
    const res = await fetch(`https://atcoder.jp/users/${encodeURIComponent(handle)}`)
    const html = await res.text()

    const ratingMatch = html.match(/Rating<\/th>\s*<td><span class='user-.*?'>(\d+)<\/span>/)
    const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0

    const maxMatch = html.match(/Highest Rating<\/th>\s*<td><span class='user-.*?'>(\d+)<\/span>/)
    const maxRating = maxMatch ? parseInt(maxMatch[1], 10) : rating

    return {
      handle,
      platform: this.platformKey,
      rating,
      maxRating,
    }
  }

  async fetchSolved(handle: string): Promise<SolvedMetrics> {
    try {
      const res = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`)
      if (!res.ok) return { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 }

      const subs = await res.json()
      const solved = new Set<string>()

      for (const s of subs) {
        if (s.result === 'AC') {
          solved.add(s.problem_id)
        }
      }

      return {
        totalSolved: solved.size,
        easySolved: Math.round(solved.size * 0.5),
        mediumSolved: Math.round(solved.size * 0.35),
        hardSolved: Math.round(solved.size * 0.15),
      }
    } catch {
      return { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 }
    }
  }

  async fetchRatingHistory(handle: string): Promise<RatingEvent[]> {
    return []
  }

  async fetchSubmissionCalendar(handle: string): Promise<SubmissionDayItem[]> {
    return []
  }

  async fetchContests(): Promise<ContestItem[]> {
    try {
      const res = await fetch('https://kenkoooo.com/atcoder/resources/contests.json')
      const contests = await res.json()
      const now = Date.now() / 1000

      return contests
        .filter((c: any) => c.start_epoch_second > now)
        .slice(0, 10)
        .map((c: any) => ({
          platform: this.platformKey,
          name: c.title,
          url: `https://atcoder.jp/contests/${c.id}`,
          startTime: new Date(c.start_epoch_second * 1000),
          endTime: new Date((c.start_epoch_second + c.duration_second) * 1000),
          durationSeconds: c.duration_second,
          phase: 'BEFORE',
        }))
    } catch {
      return []
    }
  }
}
