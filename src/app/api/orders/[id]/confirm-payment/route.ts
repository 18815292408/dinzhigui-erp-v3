import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

// PATCH：仅确认打款（不带安装师傅），订单进入 pending_shipment
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const orderId = params.id

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'pending_shipment',
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或状态不对' }, { status: 404 })
  }

  return NextResponse.json(order)
}

// POST：确认打款并分配安装师傅
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const orderId = params.id

  const { estimated_shipment_date, installer_id } = await request.json()

  if (!installer_id) {
    return NextResponse.json({ error: '请选择安装师傅' }, { status: 400 })
  }

  // 进入待出货阶段（由安装管理人员填写出货时间）
  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'pending_shipment',
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      estimated_shipment_date: estimated_shipment_date || null,
      assigned_installer: installer_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或状态不对' }, { status: 404 })
  }

  // 通知安装师傅
  if (installer_id) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: installer_id,
      type: 'new_install',
      priority: 'urgent',
      title: '新订单待安装',
      summary: `订单 ${order.order_no} (${order.customer_name || '未知'}) 已打款，待出货，请准备接单`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
