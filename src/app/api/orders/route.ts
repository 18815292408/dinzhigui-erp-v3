import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(request: Request) {
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
    .from('orders')
    .select(`
      *,
      created_by_user:users!created_by(name),
      assigned_designer_user:users!assigned_designer(name),
      assigned_installer_user:users!assigned_installer(name)
    `)
    .eq('organization_id', user.organization_id)

  // Role-based filtering
  if (user.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  } else if (user.role === 'sales') {
    query = query.eq('created_by', user.id)
  } else if (user.role === 'installer') {
    query = query.eq('assigned_installer', user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
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

  const body = await request.json()
  const {
    customer_name, customer_phone, customer_address,
    house_type, house_area, signed_amount
  } = body

  // Generate order number: DD-YYYYMMDD-NNN
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const { data: lastOrder } = await adminSupabase
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

  const { data, error } = await adminSupabase
    .from('orders')
    .insert({
      organization_id: user.organization_id,
      order_no: orderNo,
      customer_name,
      customer_phone,
      customer_address,
      house_type,
      house_area,
      signed_amount: signed_amount || null,
      created_by: user.id,
      status: 'pending_dispatch'
    })
    .select()
    .single()

  if (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
