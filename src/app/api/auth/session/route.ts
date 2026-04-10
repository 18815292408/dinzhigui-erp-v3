// Auth - Session Check
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ user: null })
  }

  const user = parseSessionUser(sessionCookie.value)
  return NextResponse.json({ user })
}
