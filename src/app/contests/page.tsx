import { createClient } from '@/lib/supabase/server'
import { StudentNavbar } from '@/components/student/StudentNavbar'
import Link from 'next/link'
import { Calendar, ExternalLink, Clock, ShieldCheck, Tag } from 'lucide-react'

export default async function ContestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, roll_number')
    .eq('id', user?.id || '')
    .single()

  const { data: contests } = await supabase
    .from('contests')
    .select('*')
    .order('start_time', { ascending: true })

  // Categorize contests
  const now = new Date()
  const live = (contests || []).filter((c) => new Date(c.start_time) <= now && new Date(c.end_time) >= now)
  const upcoming = (contests || []).filter((c) => new Date(c.start_time) > now)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <StudentNavbar studentName={profile?.name} rollNumber={profile?.roll_number} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Unified Contest Radar Engine
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Upcoming & Live Coding Contests
            </h1>
          </div>

          <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            Timezone: Asia/Kolkata (IST)
          </span>
        </div>

        {/* Live Contests Section */}
        {live.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Live Now
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {live.map((c) => (
                <div key={c.id} className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      {c.platform}
                    </span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition"
                    >
                      Join Contest <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <h3 className="text-base font-bold text-white">{c.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Duration: {Math.round(c.duration_seconds / 60)} mins
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Contests Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-indigo-400" />
            Upcoming Contests Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!upcoming || upcoming.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No upcoming contests harvested yet. Contest radar syncs automatically every 90 minutes.
              </div>
            ) : (
              upcoming.map((c) => {
                const startDate = new Date(c.start_time)
                const formattedDate = startDate.toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })

                return (
                  <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 hover:border-indigo-500/40 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                        {c.platform}
                      </span>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition"
                        title="Open Contest Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-2">{c.name}</h3>

                    <div className="space-y-1 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                      <div>Start: <strong className="text-slate-200">{formattedDate} IST</strong></div>
                      <div>Duration: {Math.round(c.duration_seconds / 60)} mins</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
