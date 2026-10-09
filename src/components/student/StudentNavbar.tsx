'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { actionSignOut } from '@/app/actions/auth'
import { LayoutDashboard, Link2, Calendar, Settings, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function StudentNavbar({
  studentName,
  rollNumber,
  onRefresh,
}: {
  studentName?: string
  rollNumber?: string
  onRefresh?: () => Promise<void>
}) {
  const pathname = usePathname()
  const [refreshing, setRefreshing] = useState(false)

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Platform Accounts', href: '/accounts', icon: Link2 },
    { label: 'Contests Radar', href: '/contests', icon: Calendar },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  async function handleRefreshClick() {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:scale-105 transition">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent block">
                ClassCode Tracker
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block">
                Codolio Profile Aggregator
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    isActive
                      ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Profile & Refresh Action */}
        <div className="flex items-center gap-4">
          {onRefresh && (
            <button
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition disabled:opacity-50"
              title="Enqueue Manual Profile Sync (10-min cooldown)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}

          <div className="hidden sm:block text-right">
            <span className="text-xs font-semibold text-slate-200 block">
              {studentName || 'Student'}
            </span>
            <span className="text-[10px] text-indigo-400 font-mono font-bold block">
              {rollNumber || '21CS042'}
            </span>
          </div>

          <form action={actionSignOut}>
            <button
              type="submit"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
