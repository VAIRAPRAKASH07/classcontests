import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const pathname = request.nextUrl.pathname

  // Handle root URL redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Gracefully handle missing environment variables without crashing Vercel middleware
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    // Public paths
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/terms')
    ) {
      if (user && pathname.startsWith('/login')) {
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

    const userRole = user.app_metadata?.role || 'STUDENT'
    const mustChangePassword = user.user_metadata?.must_change_password ?? false

    if (mustChangePassword && !pathname.startsWith('/force-change-password')) {
      return NextResponse.redirect(new URL('/force-change-password', request.url))
    }

    if (pathname.startsWith('/admin') && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (err) {
    console.error('Middleware execution error:', err)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
