import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('notifications')
    .select('*, order:orders(id, customer_name, order_no)')
    .eq('organization_id', userData?.organization_id)

  if (!['owner', 'manager'].includes(userData?.role)) {
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