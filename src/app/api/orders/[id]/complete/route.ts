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

  const adminSupabase = await createAdminClient()
  const orderId = params.id
  const now = new Date()
  const archiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // owner/manager 可以操作，installer 只能操作分配给自己的
  let query = adminSupabase
    .from('orders')
    .update({
      status: 'completed',
      installation_status: 'installed',
      completed_at: now.toISOString(),
      archived_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', orderId)
    .eq('installation_status', 'installed')

  if (user.role === 'installer') {
    query = query.eq('assigned_installer', user.id)
  }

  const { data: order, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  await adminSupabase
    .from('installations')
    .update({
      status: 'completed',
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('order_id', orderId)
    .eq('organization_id', order.organization_id)

  if (order.created_by) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.created_by,
      type: 'order_completed',
      priority: 'info',
      title: '订单已完成',
      summary: `订单 ${order.order_no} 已安装完成并归档`,
      related_order_id: orderId
    })
  }

  // 将客户的 has_active_order 设为 false
  if (order.customer_name) {
    await adminSupabase
      .from('customers')
      .update({
        has_active_order: false,
        order_stage: 'completed'
      })
      .eq('name', order.customer_name)
  }

  return NextResponse.json({ ...order, archive_month: archiveMonth })
}
