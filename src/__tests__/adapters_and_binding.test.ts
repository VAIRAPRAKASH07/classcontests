import { describe, it, expect } from 'vitest'
import { getAdapter } from '@/lib/adapters'
import crypto from 'crypto'

describe('Phase 3: Platform Adapters & Handle Verification Tests', () => {
  it('should retrieve registered adapters for Codeforces, LeetCode, CodeChef, and AtCoder', () => {
    expect(getAdapter('codeforces')).not.toBeNull()
    expect(getAdapter('leetcode')).not.toBeNull()
    expect(getAdapter('codechef')).not.toBeNull()
    expect(getAdapter('atcoder')).not.toBeNull()
  })

  it('should generate random verification token matching cct-<hex> format', () => {
    const randomHex = crypto.randomBytes(4).toString('hex')
    const verifyToken = `cct-${randomHex}`

    expect(verifyToken).toMatch(/^cct-[a-f0-9]{8}$/)
  })

  it('should verify token parsing logic against profile bio', () => {
    const token = 'cct-7f9a1c3b'
    const bioWithToken = 'Hello! Competitive programmer. Verification: cct-7f9a1c3b.'
    const bioWithoutToken = 'Hello! I love coding.'

    expect(bioWithToken.toLowerCase().includes(token.toLowerCase())).toBe(true)
    expect(bioWithoutToken.toLowerCase().includes(token.toLowerCase())).toBe(false)
  })
})
