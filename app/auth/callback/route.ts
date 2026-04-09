import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Auth callback route — handles magic link clicks (email confirmation).
 * Supabase sends users here after clicking a magic link with ?code= param.
 * We exchange the code for a session and redirect to /portal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/portal'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect back to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
