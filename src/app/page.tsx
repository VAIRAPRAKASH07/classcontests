import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const role = user.app_metadata?.role || 'STUDENT'
    const destination = (role === 'ADMIN' || role === 'SUPER_ADMIN') ? '/admin' : '/dashboard'
    redirect(destination)
  }

  redirect('/login')
}
