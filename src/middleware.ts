import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname === '/'
  ) {
    if (user && pathname.startsWith('/login')) {
      // If user is already logged in, redirect based on role in app_metadata
      const role = user.app_metadata?.role || 'STUDENT'
      const destination = (role === 'ADMIN' || role === 'SUPER_ADMIN') ? '/admin' : '/dashboard'
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return supabaseResponse
  }

  // Protected paths require authentication
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Check account status and role from app_metadata & user_metadata
  const userRole = user.app_metadata?.role || 'STUDENT'
  const mustChangePassword = user.user_metadata?.must_change_password ?? false

  // Forced password change route handler
  if (mustChangePassword && !pathname.startsWith('/force-change-password')) {
    return NextResponse.redirect(new URL('/force-change-password', request.url))
  }

  // Admin route protection
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
