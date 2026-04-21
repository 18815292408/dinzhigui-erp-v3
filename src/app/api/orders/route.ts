import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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
    .from('orders')
    .select(`
      *,
      created_by_user:users!created_by(name),
      assigned_designer_user:users!assigned_designer(name),
      assigned_installer_user:users!assigned_installer(name)
    `)
    .eq('organization_id', userData?.organization_id)

  // Role-based filtering
  if (userData?.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  } else if (userData?.role === 'sales') {
    query = query.eq('created_by', user.id)
  } else if (userData?.role === 'installer') {
    query = query.eq('assigned_installer', user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
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

  if (userData?.role !== 'sales' && !['owner', 'manager'].includes(userData?.role)) {
    return NextResponse.json({ error: 'Only sales can create orders' }, { status: 403 })
  }

  const body = await request.json()
  const {
    customer_name, customer_phone, customer_address,
    house_type, house_area
  } = body

  // Generate order number: DD-YYYYMMDD-NNN
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const { data: lastOrder } = await supabase
    .from('orders')
    .select('order_no')
    .like('order_no', `DD-${dateStr}-%`)
    .order('order_no', { ascending: false })
    .limit(1)

  let seq = 1
  if (lastOrder && lastOrder[0]?.order_no) {
    const lastSeq = parseInt(lastOrder[0].order_no.split('-')[2])
    seq = lastSeq + 1
  }
  const orderNo = `DD-${dateStr}-${String(seq).padStart(3, '0')}`

  const { data, error } = await supabase
    .from('orders')
    .insert({
      organization_id: userData?.organization_id,
      order_no: orderNo,
      customer_name,
      customer_phone,
      customer_address,
      house_type,
      house_area,
      created_by: user.id,
      status: 'pending_dispatch'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
