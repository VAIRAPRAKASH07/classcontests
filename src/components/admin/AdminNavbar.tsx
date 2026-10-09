'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { actionSignOut } from '@/app/actions/auth'
import { ShieldCheck, Users, FileText, Settings, LogOut, LayoutDashboard } from 'lucide-react'

export function AdminNavbar({ adminName, adminEmail }: { adminName?: string; adminEmail?: string }) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Students', href: '/admin/students', icon: Users },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    { label: 'Score & System Config', href: '/admin/settings', icon: Settings },
  ]

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent block">
                ClassCode Tracker
              </span>
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider block">
                Faculty Admin Portal
              </span>
            </div>
          </Link>

          {/* Navigation links */}
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
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
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

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <span className="text-xs font-medium text-slate-200 block">
              {adminName || adminEmail || 'Faculty Administrator'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {adminEmail}
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
