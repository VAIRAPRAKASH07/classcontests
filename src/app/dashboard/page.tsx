import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StudentNavbar } from '@/components/student/StudentNavbar'
import { RatingGraph } from '@/components/student/RatingGraph'
import { SubmissionHeatmap } from '@/components/student/SubmissionHeatmap'
import { computeStudentMetrics } from '@/lib/dashboard/student-metrics'
import Link from 'next/link'
import {
  Trophy,
  CheckCircle2,
  Zap,
  Flame,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Award,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
}) {
  const { viewAs } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let targetUserId = user?.id || ''
  let isViewAsAdmin = false

  // Check if admin is viewing a student's dashboard in read-only mode
  if (viewAs && user) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role === 'ADMIN' || callerProfile?.role === 'SUPER_ADMIN') {
      targetUserId = viewAs
      isViewAsAdmin = true
    }
  }

  const adminClient = createAdminClient()

  // Fetch Student Profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  // Fetch Connected Accounts
  const { data: accounts } = await adminClient
    .from('platform_accounts')
    .select('*')
    .eq('user_id', targetUserId)

  // Fetch Snapshots
  const { data: snapshots } = await adminClient
    .from('platform_snapshots')
    .select('*')
    .eq('user_id', targetUserId)
    .order('snapshot_date', { ascending: false })

  // Fetch Rating History
  const { data: ratingHistory } = await adminClient
    .from('rating_histories')
    .select('*')
    .eq('user_id', targetUserId)
    .order('contest_date', { ascending: true })

  // Fetch Submission Days
  const { data: submissionDays } = await adminClient
    .from('submission_days')
    .select('*')
    .eq('user_id', targetUserId)

  const metrics = computeStudentMetrics(snapshots || [], ratingHistory || [], submissionDays || [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Read-only banner when viewing as admin */}
      {isViewAsAdmin && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs font-semibold flex items-center justify-between z-40 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Viewing as Faculty Admin: Read-Only Masquerade Mode for {profile?.name} ({profile?.roll_number})</span>
          </div>
          <Link href="/admin/students" className="underline hover:text-white">
            Return to Admin Panel
          </Link>
        </div>
      )}

      <StudentNavbar studentName={profile?.name} rollNumber={profile?.roll_number} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Header */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl">
              {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'ST'}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{profile?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold">
                  {profile?.roll_number}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Department of {profile?.department} • Section {profile?.section} • Batch {profile?.batch_year}
              </p>

              {/* Connected Platform Icons */}
              <div className="flex items-center gap-2 mt-3">
                {accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <a
                      key={acc.id}
                      href={`https://${acc.platform}.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5 transition"
                    >
                      <span className="capitalize">{acc.platform}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ))
                ) : (
                  <Link href="/accounts" className="text-xs text-indigo-400 hover:underline font-semibold">
                    + Connect Coding Accounts
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-around">
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium block">Total Solved</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{metrics.totalSolved}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium block">Active Days</span>
              <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">{metrics.activeDays}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium block">Current Streak</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                {metrics.currentStreak}
              </span>
            </div>
          </div>
        </div>

        {/* Key KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Easy Solved</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {metrics.totalSolved > 0 ? Math.round((metrics.easySolved / metrics.totalSolved) * 100) : 0}%
              </span>
            </div>
            <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">{metrics.easySolved}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Medium Solved</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {metrics.totalSolved > 0 ? Math.round((metrics.mediumSolved / metrics.totalSolved) * 100) : 0}%
              </span>
            </div>
            <span className="text-2xl font-extrabold text-amber-400 mt-2 block">{metrics.mediumSolved}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hard Solved</span>
              <span className="text-xs font-bold text-rose-400 font-mono">
                {metrics.totalSolved > 0 ? Math.round((metrics.hardSolved / metrics.totalSolved) * 100) : 0}%
              </span>
            </div>
            <span className="text-2xl font-extrabold text-rose-400 mt-2 block">{metrics.hardSolved}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Longest Streak</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-extrabold text-white mt-2 block">{metrics.maxStreak} days</span>
          </div>
        </div>

        {/* Submission Heatmap */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              12-Month Combined Submission Activity
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {metrics.activeDays} active submission days
            </span>
          </div>
          <SubmissionHeatmap heatmap={metrics.heatmap} />
        </div>

        {/* Rating Trajectory Chart & Platform Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Contest Rating Trajectory
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {metrics.totalContests} contests recorded
              </span>
            </div>
            <RatingGraph ratingHistory={ratingHistory || []} />
          </div>

          {/* Platform breakdown cards */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Platform Rating & Tier Breakdown
            </h3>

            <div className="space-y-3">
              {Object.keys(metrics.platformMetrics).length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No verified platform metrics to display yet.
                </p>
              ) : (
                Object.entries(metrics.platformMetrics).map(([platform, data]) => (
                  <div key={platform} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white capitalize">{platform}</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">{data.rating} pts</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Max Rating: <strong className="text-slate-200">{data.maxRating}</strong></span>
                      <span>Solved: <strong className="text-emerald-400">{data.solved}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
