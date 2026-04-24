import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  let query = adminSupabase
    .from('notifications')
    .select('*, order:orders(id, customer_name, order_no, status)')
    .eq('organization_id', user.organization_id)

  if (!['owner', 'manager'].includes(user.role)) {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
    .order('priority')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}