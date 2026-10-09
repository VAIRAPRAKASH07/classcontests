import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import Link from 'next/link'
import {
  Users,
  CheckCircle2,
  Award,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  FileSpreadsheet,
  Trophy,
  Flame,
  Code2,
  Activity,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createAdminClient()

  // Fetch KPI counters
  const { count: totalStudents } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'STUDENT')
    .is('deleted_at', null)

  const { count: activeStudents } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'STUDENT')
    .eq('is_active', true)
    .is('deleted_at', null)

  const { count: verifiedAccounts } = await adminClient
    .from('platform_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'VERIFIED')

  const { data: snapshots } = await adminClient
    .from('platform_snapshots')
    .select('total_solved, rating, user_id, platform')

  const totalProblemsSolved = snapshots?.reduce((acc, s) => acc + (s.total_solved || 0), 0) || 0
  const avgRating = snapshots && snapshots.length > 0
    ? Math.round(snapshots.reduce((acc, s) => acc + (s.rating || 0), 0) / snapshots.length)
    : 0

  const bindingCompletionPct = totalStudents && totalStudents > 0
    ? Math.min(100, Math.round(((verifiedAccounts || 0) / (totalStudents * 8)) * 100))
    : 0

  // Fetch all active students & their platform data for the Codolio-style leaderboard
  const { data: studentProfiles } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'STUDENT')
    .is('deleted_at', null)

  const { data: allAccounts } = await adminClient
    .from('platform_accounts')
    .select('user_id, platform, handle, status')
    .eq('status', 'VERIFIED')

  // Aggregate student coders leaderboard
  const leaderMap = new Map<string, {
    user: any;
    totalSolved: number;
    maxRating: number;
    platforms: string[];
    score: number;
  }>()

  for (const st of studentProfiles || []) {
    leaderMap.set(st.id, {
      user: st,
      totalSolved: 0,
      maxRating: 0,
      platforms: [],
      score: 0,
    })
  }

  for (const acc of allAccounts || []) {
    const entry = leaderMap.get(acc.user_id)
    if (entry && !entry.platforms.includes(acc.platform)) {
      entry.platforms.push(acc.platform)
    }
  }

  for (const s of snapshots || []) {
    const entry = leaderMap.get(s.user_id)
    if (entry) {
      entry.totalSolved += s.total_solved || 0
      entry.maxRating = Math.max(entry.maxRating, s.rating || 0)
    }
  }

  const leaderList = Array.from(leaderMap.values()).map((item) => {
    // Codolio Composite Score Formula
    const score = (item.totalSolved * 3) + (item.maxRating * 1.5) + (item.platforms.length * 50)
    return { ...item, score }
  }).sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AdminNavbar adminEmail={user?.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Faculty Analytics & Coders Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time competitive programming performance tracking across 8 platform aggregators
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/students?action=add"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </Link>
            <Link
              href="/admin/students?action=import"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk CSV Import
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cohort Enrolment
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{activeStudents || 0}</span>
              <span className="text-xs text-slate-400">/ {totalStudents || 0} enrolled</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Standing
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Solved (Cohort)
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalProblemsSolved.toLocaleString()}</span>
              <span className="text-xs text-slate-400">problems</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Across 8 coding platforms
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Platform Verifications
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{bindingCompletionPct}%</span>
              <span className="text-xs text-slate-400">verified handles</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${bindingCompletionPct}%` }}
              />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Avg Contest Rating
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{avgRating}</span>
              <span className="text-xs text-slate-400">pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Normalized contest average
            </p>
          </div>
        </div>

        {/* Administrative Quick Actions Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Administrative Management
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/students"
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-900/90 transition group flex items-start justify-between"
            >
              <div>
                <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition block">
                  Manage Student Accounts
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Add, edit, soft-delete, reset passwords, or bulk import student CSVs.
                </span>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition shrink-0" />
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-900/90 transition group flex items-start justify-between"
            >
              <div>
                <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition block">
                  Review Immutable Audit Logs
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Audit trail of all administrative actions, student creation, and security events.
                </span>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition shrink-0" />
            </Link>
          </div>
        </div>

        {/* CODOLIO-STYLE TOP CODERS LEADERBOARD SECTION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-400">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Institutional Coders Leaderboard
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Codolio Aggregator Mode
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top performing student coders across LeetCode, Codeforces, CodeChef, AtCoder & GeeksforGeeks
                </p>
              </div>
            </div>

            <Link
              href="/leaderboard"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition self-start sm:self-auto"
            >
              View Full Institution Leaderboard <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {leaderList.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 space-y-3">
              <Code2 className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Student Profiles Found Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add student accounts or import a CSV list to start monitoring coding performance in real-time.
              </p>
              <Link
                href="/admin/students?action=add"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition mt-2"
              >
                <UserPlus className="w-4 h-4" /> Add First Student
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px] bg-slate-950/60">
                    <th className="py-3 px-4 rounded-l-xl">Rank</th>
                    <th className="py-3 px-4">Student Coder</th>
                    <th className="py-3 px-4">Dept & Sec</th>
                    <th className="py-3 px-4 text-center">Connected Platforms</th>
                    <th className="py-3 px-4 text-right">Total Solved</th>
                    <th className="py-3 px-4 text-right">Max Rating</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Codolio Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaderList.map((item, idx) => {
                    const rank = idx + 1
                    return (
                      <tr key={item.user.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold">
                          {rank === 1 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs shadow-sm">
                              🥇 1
                            </span>
                          )}
                          {rank === 2 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-xs shadow-sm">
                              🥈 2
                            </span>
                          )}
                          {rank === 3 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-xs shadow-sm">
                              🥉 3
                            </span>
                          )}
                          {rank > 3 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 text-xs font-mono">
                              #{rank}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-100">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white hover:text-indigo-400 transition">
                              {item.user.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.user.roll_number || item.user.email}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                            {item.user.department} - {item.user.section}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {item.platforms.length > 0 ? (
                              item.platforms.map((p) => (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-600 italic">No bindings yet</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono text-sm">
                          {item.totalSolved.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-amber-400 font-mono text-sm">
                          {item.maxRating > 0 ? item.maxRating : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold text-indigo-400 font-mono text-sm">
                          {item.score.toLocaleString()} pts
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
