import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // x-forwarded-host handles both Vercel and Codespaces correctly.
  // In Codespaces, the forwarded host differs from the request origin,
  // so we prefer it when present.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ? `https://${forwardedHost}` : origin

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful login — redirect to homepage
      return NextResponse.redirect(`${host}/`)
    }

    console.error('OAuth callback error:', error.message)
  }

  // Something went wrong — redirect to homepage with an error flag
  return NextResponse.redirect(`${origin}/?error=auth`)
}