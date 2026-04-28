import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

// PATCH：仅更新预计出货日期（不改变状态）
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = parseSessionUser(sessionCookie.value)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = await createAdminClient()
  const orderId = params.id
  const { estimated_shipment_date } = await request.json()

  // owner/manager 或该订单指派的安装师傅可以操作
  const isOwnerOrManager = ['owner', 'manager'].includes(user.role)
  if (!isOwnerOrManager) {
    const { data: orderForCheck } = await adminSupabase
      .from('orders')
      .select('assigned_installer')
      .eq('id', orderId)
      .eq('assigned_installer', user.id)
      .single()
    if (!orderForCheck) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 })
    }
  }

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      estimated_shipment_date,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })

  return NextResponse.json(order)
}

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

  const adminSupabase = await createAdminClient()

  const { estimated_shipment_date, installer_id } = await request.json()
  const orderId = params.id

  // owner/manager 或该订单指派的安装师傅可以操作
  const isOwnerOrManager = ['owner', 'manager'].includes(user.role)
  if (!isOwnerOrManager) {
    // 允许指派的安装师傅填写出货日期
    const { data: orderForCheck } = await adminSupabase
      .from('orders')
      .select('assigned_installer')
      .eq('id', orderId)
      .eq('assigned_installer', user.id)
      .single()
    if (!orderForCheck) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 })
    }
  }

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'in_install',
      estimated_shipment_date,
      assigned_installer: installer_id,
      installation_status: 'pending_ship',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'pending_shipment')
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  // 自动创建 installation 记录
  const { data: design } = await adminSupabase
    .from('designs')
    .select('id')
    .eq('order_id', orderId)
    .single()

  // 查找客户信息（优先用 customer_id，兜底用 customer_name）
  let customerId = order.customer_id
  if (!customerId && order.customer_name) {
    const { data: cust } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('name', order.customer_name)
      .eq('organization_id', order.organization_id)
      .single()
    customerId = cust?.id || null
  }

  const { data: existingInstallations } = await adminSupabase
    .from('installations')
    .select('id')
    .eq('order_id', orderId)
    .eq('organization_id', order.organization_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const existingInstallation = existingInstallations?.[0]

  const installationPayload = {
    customer_id: customerId,
    design_id: design?.id || null,
    assigned_to: installer_id,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }

  const { error: installError } = existingInstallation
    ? await adminSupabase
      .from('installations')
      .update(installationPayload)
      .eq('id', existingInstallation.id)
    : await adminSupabase
      .from('installations')
      .insert({
        organization_id: order.organization_id,
        order_id: orderId,
        ...installationPayload,
        issues: '[]',
      })

  if (installError) {
    console.error('Create installation on set-shipment error:', installError)
  }

  if (installer_id) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: installer_id,
      type: 'new_install',
      priority: 'urgent',
      title: '新订单待安装',
      summary: `订单 ${order.order_no} (${order.customer_name || '未知'}) 已分配给您，请确认接单`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
