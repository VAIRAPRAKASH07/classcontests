'use client'

import { useState } from 'react'
import { Database } from '@/types/database.types'
import {
  actionCreateStudent,
  actionSoftDeleteStudent,
  actionRestoreStudent,
  actionToggleStudentActiveStatus,
  actionResetStudentPassword,
  actionBulkImportStudentsCSV,
} from '@/app/actions/admin'
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export function StudentTableClient({ initialStudents }: { initialStudents: ProfileRow[] }) {
  const [students, setStudents] = useState<ProfileRow[]>(initialStudents)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('ALL')
  const [filterSec, setFilterSec] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DISABLED' | 'DELETED'>('ACTIVE')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [resetPassUser, setResetPassUser] = useState<ProfileRow | null>(null)

  // Status & Notifications
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [tempPass, setTempPass] = useState('')

  // Filtering
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDept = filterDept === 'ALL' || s.department === filterDept
    const matchesSec = filterSec === 'ALL' || s.section === filterSec

    let matchesStatus = true
    if (filterStatus === 'ACTIVE') matchesStatus = s.is_active && !s.deleted_at
    if (filterStatus === 'DISABLED') matchesStatus = !s.is_active && !s.deleted_at
    if (filterStatus === 'DELETED') matchesStatus = !!s.deleted_at

    return matchesSearch && matchesDept && matchesSec && matchesStatus
  })

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await actionCreateStudent(formData)

    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Student added successfully' })
      setShowAddModal(false)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to add student' })
    }
  }

  async function handleBulkImportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!csvContent.trim()) return
    setLoading(true)
    setMessage(null)

    const result = await actionBulkImportStudentsCSV(csvContent)
    setLoading(false)

    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Import completed successfully' })
      setShowImportModal(false)
      setCsvContent('')
    } else {
      setMessage({ type: 'error', text: result.error || 'Import failed' })
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resetPassUser || !tempPass) return
    setLoading(true)

    const result = await actionResetStudentPassword(resetPassUser.id, tempPass)
    setLoading(false)

    if (result.success) {
      setMessage({ type: 'success', text: result.message })
      setResetPassUser(null)
      setTempPass('')
    } else {
      setMessage({ type: 'error', text: result.error || 'Password reset failed' })
    }
  }

  async function handleSoftDelete(id: string) {
    if (!confirm('Are you sure you want to soft-delete this student account?')) return
    const res = await actionSoftDeleteStudent(id)
    if (res.success) {
      setStudents(students.map((s) => (s.id === id ? { ...s, deleted_at: new Date().toISOString() } : s)))
      setMessage({ type: 'success', text: 'Student soft-deleted' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Action failed' })
    }
  }

  async function handleRestore(id: string) {
    const res = await actionRestoreStudent(id)
    if (res.success) {
      setStudents(students.map((s) => (s.id === id ? { ...s, deleted_at: null } : s)))
      setMessage({ type: 'success', text: 'Student restored' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Action failed' })
    }
  }

  async function handleToggleStatus(id: string, current: boolean) {
    const res = await actionToggleStudentActiveStatus(id, current)
    if (res.success) {
      setStudents(students.map((s) => (s.id === id ? { ...s, is_active: !current } : s)))
      setMessage({ type: 'success', text: res.message || 'Status updated' })
    } else {
      setMessage({ type: 'error', text: res.error || 'Action failed' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search name, roll no, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2"
          >
            <option value="ALL">All Depts</option>
            <option value="CSE">CSE</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
          </select>

          <select
            value={filterSec}
            onChange={(e) => setFilterSec(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2"
          >
            <option value="ALL">All Secs</option>
            <option value="A">Sec A</option>
            <option value="B">Sec B</option>
            <option value="C">Sec C</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2"
          >
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
            <option value="DELETED">Soft Deleted</option>
            <option value="ALL">All Status</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Single Student
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Import CSV
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Roll No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Dept / Sec / Batch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {s.roll_number || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{s.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{s.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                        {s.department}-{s.section} ({s.batch_year})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.deleted_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Deleted
                        </span>
                      ) : s.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Banned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View as Student */}
                        <Link
                          href={`/dashboard?viewAs=${s.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                          title="View as Student (Read-Only Mode)"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Reset Password */}
                        <button
                          onClick={() => setResetPassUser(s)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                          title="Reset Temp Password"
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        {/* Enable / Disable toggle */}
                        <button
                          onClick={() => handleToggleStatus(s.id, s.is_active)}
                          className={`p-1.5 rounded-lg transition ${
                            s.is_active
                              ? 'hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'
                              : 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
                          }`}
                          title={s.is_active ? 'Disable Account' : 'Enable Account'}
                        >
                          {s.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>

                        {/* Soft Delete / Restore */}
                        {s.deleted_at ? (
                          <button
                            onClick={() => handleRestore(s.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition"
                            title="Restore Soft-deleted Profile"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(s.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                            title="Soft Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Add Single Student
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    required
                    placeholder="21CS042"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batch Year</label>
                  <input
                    type="number"
                    name="batchYear"
                    defaultValue={2025}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Gmail</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="rahul.21cs042@institution.ac.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    defaultValue="CSE"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    name="section"
                    defaultValue="A"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="text"
                  name="tempPassword"
                  defaultValue="Pass#2025Temp"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Student Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                Bulk CSV Import Students
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste CSV contents below or upload a file. Expected header columns:
              <code className="block bg-slate-950 p-2 rounded-lg text-cyan-400 font-mono text-[11px] mt-1.5">
                name, roll_number, email, department, section, batch_year, temp_password
              </code>
            </p>

            <form onSubmit={handleBulkImportSubmit} className="space-y-3">
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={`name,roll_number,email,department,section,batch_year,temp_password\nRahul Sharma,21CS042,rahul.sharma@gmail.com,CSE,A,2025,Pass#21CS042\nPriya Patel,21CS043,priya.patel@gmail.com,CSE,A,2025,Pass#21CS043`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !csvContent.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Bulk Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                Reset Temp Password
              </h3>
              <button onClick={() => setResetPassUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Reset password for <strong>{resetPassUser.name}</strong> ({resetPassUser.roll_number}). This forces password change on next login.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Temp Password</label>
                <input
                  type="text"
                  value={tempPass}
                  onChange={(e) => setTempPass(e.target.value)}
                  placeholder="Pass#2025Reset"
                  required
                  minLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || tempPass.length < 8}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
