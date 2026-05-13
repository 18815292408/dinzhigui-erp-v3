import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth'

export async function GET() {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('users')
    .select('serverchan_sendkey')
    .eq('id', session.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sendkey: data?.serverchan_sendkey || null })
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { sendkey } = body

  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase
    .from('users')
    .update({
      serverchan_sendkey: sendkey || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
