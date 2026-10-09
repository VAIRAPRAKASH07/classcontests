import {
  PlatformAdapter,
  ProfileData,
  SolvedMetrics,
  RatingEvent,
  SubmissionDayItem,
  ContestItem,
  VerificationResult,
} from './types'

export class LeetCodeAdapter implements PlatformAdapter {
  platformKey = 'leetcode'
  platformName = 'LeetCode'

  private async queryGraphQL(query: string, variables: Record<string, unknown>) {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!res.ok) {
      throw new Error(`LeetCode GraphQL error: ${res.statusText}`)
    }
    return res.json()
  }

  async validateHandle(handle: string, expectedToken?: string): Promise<VerificationResult> {
    try {
      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              aboutMe
              userAvatar
            }
          }
        }
      `
      const data = await this.queryGraphQL(query, { username: handle })

      if (!data?.data?.matchedUser) {
        return { valid: false, tokenFound: false, error: 'LeetCode user not found' }
      }

      const aboutMe = (data.data.matchedUser.profile?.aboutMe || '').toLowerCase()
      const tokenFound = expectedToken ? aboutMe.includes(expectedToken.toLowerCase()) : true

      return { valid: true, tokenFound }
    } catch (err: unknown) {
      return { valid: false, tokenFound: false, error: err instanceof Error ? err.message : 'GraphQL Error' }
    }
  }

  async fetchProfile(handle: string): Promise<ProfileData> {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            userAvatar
            realName
            aboutMe
          }
          userContestRanking {
            rating
            globalRanking
            topPercentage
          }
        }
      }
    `
    const data = await this.queryGraphQL(query, { username: handle })
    const u = data?.data?.matchedUser
    if (!u) throw new Error(`LeetCode user ${handle} not found`)

    return {
      handle: u.username,
      platform: this.platformKey,
      avatarUrl: u.profile?.userAvatar,
      name: u.profile?.realName || u.username,
      bio: u.profile?.aboutMe,
      globalRank: u.userContestRanking?.globalRanking || 0,
      rating: Math.round(u.userContestRanking?.rating || 0),
      maxRating: Math.round(u.userContestRanking?.rating || 0),
    }
  }

  async fetchSolved(handle: string): Promise<SolvedMetrics> {
    const query = `
      query getUserSolved($username: String!) {
        matchedUser(username: $username) {
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `
    const data = await this.queryGraphQL(query, { username: handle })
    const stats = data?.data?.matchedUser?.submitStats?.acSubmissionNum || []

    let easy = 0
    let medium = 0
    let hard = 0
    let total = 0

    for (const item of stats) {
      if (item.difficulty === 'All') total = item.count
      if (item.difficulty === 'Easy') easy = item.count
      if (item.difficulty === 'Medium') medium = item.count
      if (item.difficulty === 'Hard') hard = item.count
    }

    return {
      totalSolved: total,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
    }
  }

  async fetchRatingHistory(handle: string): Promise<RatingEvent[]> {
    const query = `
      query getUserContestHistory($username: String!) {
        userContestRankingHistory(username: $username) {
          attended
          rating
          ranking
          contest {
            title
            startTime
          }
        }
      }
    `
    const data = await this.queryGraphQL(query, { username: handle })
    const history = data?.data?.userContestRankingHistory || []

    let prevRating = 1500
    const events: RatingEvent[] = []

    for (const item of history) {
      if (item.attended) {
        const currentRating = Math.round(item.rating)
        const ratingChange = currentRating - prevRating
        prevRating = currentRating

        events.push({
          contestName: item.contest.title,
          rating: currentRating,
          rank: item.ranking,
          ratingChange,
          contestDate: new Date(item.contest.startTime * 1000),
        })
      }
    }

    return events
  }

  async fetchSubmissionCalendar(handle: string): Promise<SubmissionDayItem[]> {
    const query = `
      query getUserCalendar($username: String!) {
        matchedUser(username: $username) {
          submissionCalendar
        }
      }
    `
    const data = await this.queryGraphQL(query, { username: handle })
    const calendarStr = data?.data?.matchedUser?.submissionCalendar
    if (!calendarStr) return []

    try {
      const calendarObj: Record<string, number> = JSON.parse(calendarStr)
      return Object.entries(calendarObj).map(([ts, count]) => ({
        submissionDate: new Date(parseInt(ts, 10) * 1000).toISOString().split('T')[0],
        count,
      }))
    } catch {
      return []
    }
  }

  async fetchContests(): Promise<ContestItem[]> {
    const query = `
      query getContests {
        topTwoContests {
          title
          startTime
          duration
          cardImg
        }
      }
    `
    try {
      const data = await this.queryGraphQL(query, {})
      const contests = data?.data?.topTwoContests || []

      return contests.map((c: any) => ({
        platform: this.platformKey,
        name: c.title,
        url: 'https://leetcode.com/contest/',
        startTime: new Date(c.startTime * 1000),
        endTime: new Date((c.startTime + c.duration) * 1000),
        durationSeconds: c.duration,
        phase: 'BEFORE',
      }))
    } catch {
      return []
    }
  }
}
