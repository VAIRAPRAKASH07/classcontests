import { PlatformAdapter } from './types'
import { CodeforcesAdapter } from './codeforces'
import { LeetCodeAdapter } from './leetcode'
import { CodeChefAdapter } from './codechef'
import { AtCoderAdapter } from './atcoder'

export const platformAdapters: Record<string, PlatformAdapter> = {
  codeforces: new CodeforcesAdapter(),
  leetcode: new LeetCodeAdapter(),
  codechef: new CodeChefAdapter(),
  atcoder: new AtCoderAdapter(),
}

export function getAdapter(platformKey: string): PlatformAdapter | null {
  return platformAdapters[platformKey.toLowerCase()] || null
}
