'use client'

import { useMemo } from 'react'

export function SubmissionHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  // Generate array of 365 days leading up to today
  const days = useMemo(() => {
    const list: { dateStr: string; count: number; dayOfWeek: number }[] = []
    const today = new Date()

    for (let i = 364; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      list.push({
        dateStr,
        count: heatmap[dateStr] || 0,
        dayOfWeek: d.getDay(),
      })
    }
    return list
  }, [heatmap])

  function getLevelClass(count: number) {
    if (count === 0) return 'bg-slate-950 border border-slate-800/80'
    if (count <= 3) return 'bg-indigo-950/80 border border-indigo-900/60 text-indigo-300'
    if (count <= 7) return 'bg-indigo-700 border border-indigo-600 text-white'
    if (count <= 12) return 'bg-indigo-500 border border-indigo-400 text-white'
    return 'bg-cyan-400 border border-cyan-300 text-slate-950 font-bold'
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 p-1">
          {days.map((item) => (
            <div
              key={item.dateStr}
              title={`${item.dateStr}: ${item.count} submission(s)`}
              className={`w-3.5 h-3.5 rounded-sm ${getLevelClass(item.count)} transition hover:scale-125 hover:z-10`}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-950 border border-slate-800" />
        <div className="w-3 h-3 rounded-sm bg-indigo-950/80 border border-indigo-900" />
        <div className="w-3 h-3 rounded-sm bg-indigo-700" />
        <div className="w-3 h-3 rounded-sm bg-indigo-500" />
        <div className="w-3 h-3 rounded-sm bg-cyan-400" />
        <span>More</span>
      </div>
    </div>
  )
}
