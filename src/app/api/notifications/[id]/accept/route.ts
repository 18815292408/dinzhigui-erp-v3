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

  const body = await request.json()
  const { design_due_days } = body

  const adminSupabase = await createAdminClient()

  // Get notification to find related order
  const { data: notification, error: notifError } = await adminSupabase
    .from('notifications')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (notifError) {
    return NextResponse.json({ error: '获取通知失败: ' + notifError.message }, { status: 500 })
  }

  if (!notification) {
    return NextResponse.json({ error: '通知不存在' }, { status: 404 })
  }

  const orderId = notification.related_order_id
  if (!orderId) {
    return NextResponse.json({ error: '通知没有关联订单' }, { status: 400 })
  }

  // Get the order
  const { data: order } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  // 只允许在 pending_design 状态下接单，防止重复接单
  if (order.status !== 'pending_design') {
    return NextResponse.json({ error: '该订单已被接单，无需重复操作' }, { status: 400 })
  }

  // 检查当前用户是否为该订单的指定设计师
  if (order.assigned_designer && order.assigned_designer !== user.id) {
    return NextResponse.json({ error: '该订单已被分配给其他设计师' }, { status: 400 })
  }

  // Calculate design due date
  let designDueDate = null
  if (design_due_days && design_due_days > 0) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + parseInt(design_due_days))
    designDueDate = dueDate.toISOString().slice(0, 10)
  }

  // 检查是否已存在该订单的设计方案（幂等性保护）
  const { data: existingDesign } = await adminSupabase
    .from('designs')
    .select('id')
    .eq('order_id', orderId)
    .eq('created_by', user.id)
    .maybeSingle()

  let design: any
  if (existingDesign) {
    design = existingDesign
  } else {
    // Create a new design record for this order
    // 注意：订单没有 customer_id 字段，客户信息通过 order_id 关联的订单获取
    const { data: newDesign, error: designError } = await adminSupabase
      .from('designs')
      .insert({
        organization_id: order.organization_id,
        created_by: user.id,
        status: 'draft',
        title: `${order.customer_name} - 设计方案`,
        order_id: orderId,  // 通过 order_id 关联订单，客户信息从订单的 customer_name/customer_phone 获取
      })
      .select()
      .single()

    if (designError) {
      return NextResponse.json({ error: '创建设计方案失败: ' + designError.message }, { status: 500 })
    }
    design = newDesign
  }

  // Update order status and design deadline
  const updates: any = {
    status: 'designing',
    updated_at: new Date().toISOString()
  }
  if (design_due_days) {
    updates.design_due_days = parseInt(design_due_days)
  }
  if (designDueDate) {
    updates.design_due_date = designDueDate
  }

  await adminSupabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  // Mark notification as read (owner/manager 可标记任意通知，其他人只能标记自己的)
  let readQuery = adminSupabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
  if (!['owner', 'manager'].includes(user.role)) {
    readQuery = readQuery.eq('user_id', user.id)
  }
  const { error: readError } = await readQuery

  if (readError) {
    console.error('Failed to mark notification as read:', readError)
    return NextResponse.json({ error: '标记已读失败: ' + readError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, design_id: design.id })
}
