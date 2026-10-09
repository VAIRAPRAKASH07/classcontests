import {
  PlatformAdapter,
  ProfileData,
  SolvedMetrics,
  RatingEvent,
  SubmissionDayItem,
  ContestItem,
  VerificationResult,
} from './types'

export class CodeChefAdapter implements PlatformAdapter {
  platformKey = 'codechef'
  platformName = 'CodeChef'

  async validateHandle(handle: string, expectedToken?: string): Promise<VerificationResult> {
    try {
      const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })

      if (!res.ok) {
        return { valid: false, tokenFound: false, error: 'CodeChef handle not found' }
      }

      const html = await res.text()
      const tokenFound = expectedToken ? html.toLowerCase().includes(expectedToken.toLowerCase()) : true

      return { valid: true, tokenFound }
    } catch (err: unknown) {
      return { valid: false, tokenFound: false, error: err instanceof Error ? err.message : 'Fetch error' }
    }
  }

  async fetchProfile(handle: string): Promise<ProfileData> {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()

    // Regex extract rating
    const ratingMatch = html.match(/class="rating-number">(\d+)</)
    const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0

    const maxRatingMatch = html.match(/Highest Rating\s*\((\d+)\)/i)
    const maxRating = maxRatingMatch ? parseInt(maxRatingMatch[1], 10) : rating

    const starsMatch = html.match(/class="rating-star"><span>(.*?)<\/span>/)
    const tierName = starsMatch ? starsMatch[1] : 'unrated'

    return {
      handle,
      platform: this.platformKey,
      rating,
      maxRating,
      tierName,
    }
  }

  async fetchSolved(handle: string): Promise<SolvedMetrics> {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()

    const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/Problems Solved:?\s*(\d+)/i)
    const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0

    return {
      totalSolved,
      easySolved: Math.round(totalSolved * 0.5),
      mediumSolved: Math.round(totalSolved * 0.35),
      hardSolved: Math.round(totalSolved * 0.15),
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
      const res = await fetch('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc')
      const data = await res.json()
      const future = data?.future_contests || []

      return future.map((c: any) => ({
        platform: this.platformKey,
        name: c.contest_name,
        url: `https://www.codechef.com/${c.contest_code}`,
        startTime: new Date(c.contest_start_date_iso),
        endTime: new Date(c.contest_end_date_iso),
        durationSeconds: parseInt(c.contest_duration, 10) * 60 || 7200,
        phase: 'BEFORE',
      }))
    } catch {
      return []
    }
  }
}
