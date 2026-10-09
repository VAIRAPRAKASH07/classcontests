import { createClient } from '@/lib/supabase/server'
import { AccountsPageClient } from '@/components/student/AccountsPageClient'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('*')
    .eq('user_id', user?.id || '')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <ShieldCheck className="w-4 h-4" />
            Secure Verification Protocol
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Connected Coding Profiles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bind your competitive programming handles to sync ratings, problem counts, contest ranks, and streaks.
          </p>
        </div>

        <AccountsPageClient boundAccounts={accounts || []} />
      </div>
    </div>
  )
}
