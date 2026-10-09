import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4" />
              DPDP Act 2023 India Compliant
            </div>
            <h1 className="text-2xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-xs text-slate-400 mt-1">Effective Date: October 2026 • Region: AWS ap-south-1 (Mumbai)</p>
          </div>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Purpose Limitation & Collection</h2>
            <p>
              ClassCode Tracker collects only public competitive programming metrics (ratings, problem counts, submission heatmaps) and institutional contact details (name, roll number, department, section, Gmail) strictly for academic progress monitoring. No third-party passwords, payment details, or personal sensitive tokens are ever requested or stored.
            </p>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Data Hosting & Sovereignty</h2>
            <p>
              All application data, authentication credentials, and database backups are hosted strictly within the <strong>Mumbai, India region (`ap-south-1`)</strong> on Supabase Postgres in full alignment with Digital Personal Data Protection (DPDP) Act 2023 principles.
            </p>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Rights to Erasure & Unbinding</h2>
            <p>
              Students retain full self-service rights to unbind platform handles at any time via the Accounts settings or request complete account erasure from institutional faculty admins.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
