import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

// POST：在 pending_shipment 阶段分配安装师傅
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

  const { installer_id } = await request.json()

  if (!installer_id) {
    return NextResponse.json({ error: '请选择安装师傅' }, { status: 400 })
  }

  // 在 pending_shipment 阶段分配安装师傅（不出货日期，由安装师傅自己填）
  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      assigned_installer: installer_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'pending_shipment')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或状态不对' }, { status: 404 })
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

  if (existingInstallation) {
    await adminSupabase
      .from('installations')
      .update({
        customer_id: customerId,
        design_id: design?.id || null,
        assigned_to: installer_id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingInstallation.id)
  } else {
    await adminSupabase
      .from('installations')
      .insert({
        organization_id: order.organization_id,
        order_id: orderId,
        customer_id: customerId,
        design_id: design?.id || null,
        assigned_to: installer_id,
        status: 'pending',
        issues: '[]',
      })
  }

  // 通知安装师傅
  await adminSupabase.from('notifications').insert({
    organization_id: order.organization_id,
    user_id: installer_id,
    type: 'new_install',
    priority: 'urgent',
    title: '新订单待安装',
    summary: `订单 ${order.order_no} (${order.customer_name || '未知'}) 已打款，待出货，请进入安装管理填写出货日期`,
    related_order_id: orderId
  })

  return NextResponse.json(order)
}
