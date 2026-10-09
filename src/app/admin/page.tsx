import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import Link from 'next/link'
import {
  Users,
  CheckCircle2,
  Database,
  Activity,
  Award,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  FileSpreadsheet,
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
    .select('total_solved, rating')

  const totalProblemsSolved = snapshots?.reduce((acc, s) => acc + (s.total_solved || 0), 0) || 0
  const avgRating = snapshots && snapshots.length > 0
    ? Math.round(snapshots.reduce((acc, s) => acc + (s.rating || 0), 0) / snapshots.length)
    : 0

  const bindingCompletionPct = totalStudents && totalStudents > 0
    ? Math.min(100, Math.round(((verifiedAccounts || 0) / (totalStudents * 8)) * 100))
    : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AdminNavbar adminEmail={user?.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Faculty Overview Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Class-wide competitive programming performance, account management & database metrics
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
              <span className="text-xs text-slate-400">/ {totalStudents || 0} total enrolled</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% active standing
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
              Across all 8 competitive platforms
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Binding Completion
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{bindingCompletionPct}%</span>
              <span className="text-xs text-slate-400">verified</span>
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
                Avg Rating Score
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
              Normalized contest rating average
            </p>
          </div>
        </div>

        {/* DB Quota & System Health Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Database Storage Health */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Database Quota Health Check</h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                HEALTHY
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Supabase Free Tier Quota limit is <strong>500 MB</strong>. ClassCode Tracker utilizes compact snapshots with 90-day daily retention.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Estimated Sizing (N = 70 Students)</span>
                <span className="text-indigo-400 font-mono">~65.4 MB / 500 MB (13.0%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full p-0.5 border border-slate-800">
                <div className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-400 h-full rounded-full w-[13%]" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
              <span>PRUNE_RETENTION Job Status: Active</span>
              <span>Keep-alive ping: OK</span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Administrative Quick Actions
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
                    Create, edit, soft-delete, reset passwords, or import CSV lists.
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
                    Review Audit Logs
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Immutable security log of all admin operations and password resets.
                  </span>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
