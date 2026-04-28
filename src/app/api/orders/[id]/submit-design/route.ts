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

  let final_order_amount: number | undefined
  try {
    const body = await request.json()
    final_order_amount = body.final_order_amount
  } catch {}

  const updates: Record<string, unknown> = {
    status: 'pending_order',
    updated_at: new Date().toISOString()
  }
  if (final_order_amount != null) {
    updates.final_order_amount = parseFloat(String(final_order_amount))
  }

  // 只有 owner/manager/designer 可以操作
  if (!['owner', 'manager', 'designer'].includes(user.role)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  // designer 只能操作分配给自己的订单
  let query = adminSupabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('status', 'designing')

  if (user.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  }

  const { data: order, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  // 同步更新关联 design 的状态为 submitted
  await adminSupabase
    .from('designs')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('order_id', orderId)

  if (order.created_by) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.created_by,
      type: 'design_submitted',
      priority: 'normal',
      title: '方案已提交',
      summary: `订单 ${order.order_no} 的方案已提交，等待下单`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
