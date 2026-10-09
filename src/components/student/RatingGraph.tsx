'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Database } from '@/types/database.types'

type RatingRow = Database['public']['Tables']['rating_histories']['Row']

export function RatingGraph({ ratingHistory }: { ratingHistory: RatingRow[] }) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
        No contest rating history available yet. Participate in contests to see rating trajectory graphs.
      </div>
    )
  }

  const sorted = [...ratingHistory].sort(
    (a, b) => new Date(a.contest_date).getTime() - new Date(b.contest_date).getTime()
  )

  const data = sorted.map((r) => ({
    date: new Date(r.contest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rating: r.rating,
    contestName: r.contest_name,
    platform: r.platform,
    rank: r.rank,
    change: r.rating_change,
  }))

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-1 z-50">
                    <span className="font-bold text-white block">{item.contestName}</span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>Platform: <strong className="text-slate-200 capitalize">{item.platform}</strong></span>
                      {item.rank && <span>Rank: <strong className="text-cyan-400">#{item.rank}</strong></span>}
                    </div>
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
                      <span className="font-bold text-indigo-400 text-sm">{item.rating} pts</span>
                      <span className={`font-semibold text-xs ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.change >= 0 ? `+${item.change}` : item.change}
                      </span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#0f172a' }}
            activeDot={{ r: 6, fill: '#38bdf8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
