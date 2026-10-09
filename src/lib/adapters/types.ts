export interface ProfileData {
  handle: string
  platform: string
  avatarUrl?: string
  name?: string
  organization?: string
  bio?: string
  globalRank?: number
  countryRank?: number
  rating?: number
  maxRating?: number
  tierName?: string
}

export interface SolvedMetrics {
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSubmissions?: number
  activeDays?: number
  currentStreak?: number
  maxStreak?: number
  compactMetrics?: Record<string, unknown>
}

export interface RatingEvent {
  contestName: string
  contestId?: string
  rating: number
  rank?: number
  ratingChange: number
  contestDate: Date
}

export interface SubmissionDayItem {
  submissionDate: string // UTC YYYY-MM-DD
  count: number
}

export interface ContestItem {
  platform: string
  name: string
  url: string
  startTime: Date
  endTime: Date
  durationSeconds: number
  phase: 'BEFORE' | 'CODING' | 'FINISHED'
}

export interface VerificationResult {
  valid: boolean
  tokenFound: boolean
  error?: string
}

export interface PlatformAdapter {
  platformKey: string
  platformName: string
  validateHandle(handle: string, expectedToken?: string): Promise<VerificationResult>
  fetchProfile(handle: string): Promise<ProfileData>
  fetchSolved(handle: string): Promise<SolvedMetrics>
  fetchRatingHistory(handle: string): Promise<RatingEvent[]>
  fetchSubmissionCalendar(handle: string): Promise<SubmissionDayItem[]>
  fetchContests?(): Promise<ContestItem[]>
}
