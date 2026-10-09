import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import { StudentTableClient } from '@/components/admin/StudentTableClient'

export default async function AdminStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createAdminClient()

  // Fetch all profiles including soft-deleted ones for faculty view
  const { data: students } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'STUDENT')
    .order('roll_number', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AdminNavbar adminEmail={user?.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Student Account Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student credentials, batch enrolment, temporary passwords, soft-deletes and bulk CSV imports.
          </p>
        </div>

        <StudentTableClient initialStudents={students || []} />
      </main>
    </div>
  )
}
