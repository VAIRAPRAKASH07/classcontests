'use client'

import { useState } from 'react'
import { Database } from '@/types/database.types'
import { actionSubmitHandle, actionVerifyHandle, actionUnbindHandle } from '@/app/actions/binding'
import { CheckCircle2, AlertCircle, Loader2, Trash2, ExternalLink, Copy, Check } from 'lucide-react'

type PlatformAccount = Database['public']['Tables']['platform_accounts']['Row']

interface PlatformConfig {
  key: string
  name: string
  urlPrefix: string
  example: string
  color: string
}

const PLATFORMS: PlatformConfig[] = [
  { key: 'leetcode', name: 'LeetCode', urlPrefix: 'leetcode.com/u/', example: 'alex_code', color: 'from-amber-500 to-orange-500' },
  { key: 'codeforces', name: 'Codeforces', urlPrefix: 'codeforces.com/profile/', example: 'tourist', color: 'from-blue-500 to-indigo-500' },
  { key: 'codechef', name: 'CodeChef', urlPrefix: 'codechef.com/users/', example: 'chef_master', color: 'from-amber-700 to-amber-900' },
  { key: 'atcoder', name: 'AtCoder', urlPrefix: 'atcoder.jp/users/', example: 'chokudai', color: 'from-slate-400 to-slate-200' },
  { key: 'geeksforgeeks', name: 'GeeksforGeeks', urlPrefix: 'geeksforgeeks.org/user/', example: 'gfg_coder', color: 'from-emerald-500 to-green-600' },
  { key: 'hackerrank', name: 'HackerRank', urlPrefix: 'hackerrank.com/profile/', example: 'hr_dev', color: 'from-green-500 to-emerald-600' },
  { key: 'interviewbit', name: 'InterviewBit', urlPrefix: 'interviewbit.com/profile/', example: 'ib_user', color: 'from-cyan-500 to-blue-600' },
  { key: 'code360', name: 'Code360 / Coding Ninjas', urlPrefix: 'naukri.com/code360/profile/', example: 'ninja_01', color: 'from-orange-500 to-red-600' },
]

export function AccountsPageClient({ boundAccounts }: { boundAccounts: PlatformAccount[] }) {
  const [accountMap, setAccountMap] = useState<Record<string, PlatformAccount>>(
    boundAccounts.reduce((acc, curr) => ({ ...acc, [curr.platform]: curr }), {})
  )

  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(platformKey: string) {
    const handle = inputs[platformKey] || ''
    if (!handle) return
    setLoadingKey(`submit-${platformKey}`)
    setMessage(null)

    const res = await actionSubmitHandle(platformKey, handle)
    setLoadingKey(null)

    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Handle submitted!' })
      // Update local state
      setAccountMap((prev) => ({
        ...prev,
        [platformKey]: {
          id: 'temp',
          user_id: '',
          platform: platformKey as any,
          handle,
          status: 'PENDING',
          verify_token: res.verifyToken || '',
          verified_at: null,
          last_synced_at: null,
          sync_status: 'STALE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }))
    } else {
      setMessage({ type: 'error', text: res.error || 'Submission failed' })
    }
  }

  async function handleVerify(platformKey: string) {
    setLoadingKey(`verify-${platformKey}`)
    setMessage(null)

    const res = await actionVerifyHandle(platformKey)
    setLoadingKey(null)

    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Verification successful!' })
      setAccountMap((prev) => ({
        ...prev,
        [platformKey]: {
          ...prev[platformKey],
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
        },
      }))
    } else {
      setMessage({ type: 'error', text: res.error || 'Verification failed' })
    }
  }

  async function handleUnbind(platformKey: string) {
    if (!confirm(`Are you sure you want to unbind your ${platformKey} account?`)) return
    setLoadingKey(`unbind-${platformKey}`)
    setMessage(null)

    const res = await actionUnbindHandle(platformKey)
    setLoadingKey(null)

    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Account unbound' })
      const next = { ...accountMap }
      delete next[platformKey]
      setAccountMap(next)
    } else {
      setMessage({ type: 'error', text: res.error || 'Unbind failed' })
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedToken(text)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Problem Solving Platform Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
          Problem Solving & Competitive Programming Platforms
        </h2>

        <div className="space-y-4">
          {PLATFORMS.map((p) => {
            const acc = accountMap[p.key]
            const isVerified = acc?.status === 'VERIFIED'
            const isPending = acc?.status === 'PENDING'
            const isSubmitting = loadingKey === `submit-${p.key}`
            const isVerifying = loadingKey === `verify-${p.key}`
            const isUnbinding = loadingKey === `unbind-${p.key}`

            return (
              <div
                key={p.key}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700"
              >
                {/* Left: Platform Label & Status */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0`}>
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" /> Pending Verification
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono block mt-0.5">
                      {p.urlPrefix}
                    </span>
                  </div>
                </div>

                {/* Right: Input or Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {isVerified ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        @{acc.handle}
                      </span>
                      <button
                        onClick={() => handleUnbind(p.key)}
                        disabled={isUnbinding}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                        title="Unbind Handle"
                      >
                        {isUnbinding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : isPending ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-1.5">
                        <span className="text-[11px] text-slate-400">Token:</span>
                        <code className="text-xs font-mono text-amber-400 font-bold">{acc.verify_token}</code>
                        <button
                          onClick={() => copyToClipboard(acc.verify_token)}
                          className="text-slate-400 hover:text-white"
                          title="Copy Token"
                        >
                          {copiedToken === acc.verify_token ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => handleVerify(p.key)}
                        disabled={isVerifying}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Token'}
                      </button>

                      <button
                        onClick={() => handleUnbind(p.key)}
                        className="p-1.5 rounded-xl bg-slate-900 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={p.example}
                        value={inputs[p.key] || ''}
                        onChange={(e) => setInputs({ ...inputs, [p.key]: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:border-indigo-500 focus:outline-none w-36 sm:w-44"
                      />
                      <button
                        onClick={() => handleSubmit(p.key)}
                        disabled={isSubmitting || !inputs[p.key]}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
