import { createClient } from '@/lib/supabase/server'
import { StudentNavbar } from '@/components/student/StudentNavbar'
import Link from 'next/link'
import { Trophy, Award, Medal, ArrowLeft, Download, ShieldCheck } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch current student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, roll_number')
    .eq('id', user?.id || '')
    .single()

  // Query secure student_leaderboard_view (no roll_number exposed)
  const { data: leaderboard } = await supabase
    .from('student_leaderboard_view')
    .select('*')
    .order('rank', { ascending: true })

  const topThree = (leaderboard || []).slice(0, 3)
  const rest = (leaderboard || []).slice(3)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <StudentNavbar studentName={profile?.name} rollNumber={profile?.roll_number} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Class-Wide Leaderboard Standing
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Competitive Programming Leaderboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              Formula: Weighted Solved + Ratings
            </span>
          </div>
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-2 relative overflow-hidden order-2 md:order-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 font-extrabold text-lg flex items-center justify-center mx-auto border border-slate-700">
                  #2
                </div>
                <h3 className="font-bold text-white text-base">{topThree[1].student_name}</h3>
                <span className="text-xs text-slate-400 block font-mono">{topThree[1].total_solved} solved</span>
                <span className="text-sm font-extrabold text-indigo-400 block">{topThree[1].overall_score} pts</span>
              </div>
            )}

            {/* Rank 1 Podium Gold */}
            {topThree[0] && (
              <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-2 relative overflow-hidden order-1 md:order-2 md:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-extrabold text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                  <Trophy className="w-7 h-7 fill-slate-950 text-slate-950" />
                </div>
                <h3 className="font-extrabold text-white text-lg">{topThree[0].student_name}</h3>
                <span className="text-xs text-indigo-300 block font-mono">{topThree[0].total_solved} solved</span>
                <span className="text-base font-extrabold text-amber-400 block">{topThree[0].overall_score} pts</span>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-2 relative overflow-hidden order-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-900/30 text-amber-500 font-extrabold text-lg flex items-center justify-center mx-auto border border-amber-800/40">
                  #3
                </div>
                <h3 className="font-bold text-white text-base">{topThree[2].student_name}</h3>
                <span className="text-xs text-slate-400 block font-mono">{topThree[2].total_solved} solved</span>
                <span className="text-sm font-extrabold text-indigo-400 block">{topThree[2].overall_score} pts</span>
              </div>
            )}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Student Name</th>
                  <th className="py-4 px-6">Dept / Sec</th>
                  <th className="py-4 px-6">Total Solved</th>
                  <th className="py-4 px-6 text-right">Composite Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {!leaderboard || leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                      Leaderboard cache is empty. Awaiting scheduled recomputation.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition ${row.is_current_user ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-200">
                        #{row.rank}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-white">
                        {row.student_name} {row.is_current_user && <span className="text-indigo-400 text-[10px] font-mono ml-1.5">(You)</span>}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-400">
                        {row.department}-{row.section}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-emerald-400 font-bold">
                        {row.total_solved}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-extrabold text-indigo-400 text-sm">
                        {row.overall_score}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
