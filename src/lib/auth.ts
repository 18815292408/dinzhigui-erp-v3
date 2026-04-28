// Shared auth helpers for API routes and server components
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser, SessionUser } from '@/lib/types'

/**
 * Validate session and check expiry. Returns SessionUser on success,
 * or a NextResponse error on failure. Use in API route handlers.
 */
export async function requireSession(): Promise<SessionUser | NextResponse> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  // Check if account has expired
  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from('users')
    .select('expires_at')
    .eq('id', user.id)
    .single()

  if (profile?.expires_at) {
    const expiresAt = new Date(profile.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: '账号已过期，请联系管理员续期' }, { status: 403 })
    }
  }

  return user
}
