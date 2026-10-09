import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-xs text-slate-400 mt-1">Institutional Usage Terms</p>
          </div>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Academic Use Policy</h2>
            <p>
              ClassCode Tracker is intended solely for internal academic evaluation, competitive programming tracking, and faculty monitoring within the institution.
            </p>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Account Responsibility</h2>
            <p>
              Users are responsible for binding authentic platform handles. Attempting to bind or impersonate third-party accounts is strictly prohibited and logged in the administrative audit log.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
