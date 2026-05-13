import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

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

  // owner/manager 可以操作，安装师傅也可以（安装完成后需要售后很常见）
  if (!['owner', 'manager', 'installer'].includes(user.role)) {
    return NextResponse.json({ error: '无权进入售后流程' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const orderId = params.id

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'in_after_sales',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .eq('status', 'in_install')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或当前状态不可进入售后' }, { status: 404 })
  }

  // 通知安装师傅进入售后
  if (order.assigned_installer) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.assigned_installer,
      sender_id: user.id,
      type: 'order_status_change',
      priority: 'normal',
      title: '订单进入售后',
      summary: `订单 ${order.order_no} 已进入售后流程，请关注反馈`,
      related_order_id: orderId
    })
  }

  // 更新 customer order_stage
  if (order.customer_name) {
    await adminSupabase
      .from('customers')
      .update({ order_stage: 'in_after_sales' })
      .eq('name', order.customer_name)
  }

  return NextResponse.json(order)
}
