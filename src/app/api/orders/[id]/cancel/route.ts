import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { canCancelOrder } from '@/lib/permissions'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = parseSessionUser(sessionCookie.value)
    if (!user) {
      return NextResponse.json({ error: '无效会话' }, { status: 401 })
    }

    const adminSupabase = await createAdminClient()
    const orderId = params.id

    // 查询订单
    const { data: order, error: orderErr } = await adminSupabase
      .from('orders')
      .select('id, organization_id, status, installation_status, created_by, assigned_designer, assigned_installer, order_no, customer_name, signed_amount, final_order_amount')
      .eq('id', orderId)
      .single()

    if (orderErr) {
      console.error('CANCEL order - fetch error:', orderErr)
      return NextResponse.json({ error: orderErr.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    // 权限检查
    if (!canCancelOrder(order, user)) {
      return NextResponse.json({ error: '无权退订该订单' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // 更新订单状态为已退订
    const { data: updatedOrder, error: updateErr } = await adminSupabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: user.id,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('organization_id', user.organization_id)
      .select()
      .single()

    if (updateErr) {
      console.error('CANCEL order - update error:', updateErr)
      return NextResponse.json({ error: '退订失败：' + updateErr.message }, { status: 500 })
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
    }

    // 记录退订日志
    const { error: logErr } = await adminSupabase
      .from('order_cancel_logs')
      .insert({
        organization_id: user.organization_id,
        order_id: orderId,
        cancelled_by: user.id,
        cancelled_by_name: user.name,
        order_no: order.order_no,
        customer_name: order.customer_name,
        signed_amount: order.signed_amount,
        final_order_amount: order.final_order_amount,
        previous_status: order.status,
      })

    if (logErr) {
      console.error('CANCEL order - log error:', logErr)
      // 日志记录失败不影响主流程
    }

    // 更新客户的 has_active_order 状态
    if (order.customer_name) {
      await adminSupabase
        .from('customers')
        .update({
          has_active_order: false,
          order_stage: 'cancelled',
        })
        .eq('name', order.customer_name)
        .eq('organization_id', user.organization_id)
    }

    // 发送通知给相关人员
    const notifyUserIds = new Set<string>()
    if (order.created_by && order.created_by !== user.id) notifyUserIds.add(order.created_by)
    if (order.assigned_designer && order.assigned_designer !== user.id) notifyUserIds.add(order.assigned_designer)
    if (order.assigned_installer && order.assigned_installer !== user.id) notifyUserIds.add(order.assigned_installer)

    // 使用 for...of 确保通知发送被正确等待
    for (const notifyUserId of Array.from(notifyUserIds)) {
      await adminSupabase.from('notifications').insert({
        organization_id: user.organization_id,
        user_id: notifyUserId,
        sender_id: user.id,
        type: 'order_cancelled',
        priority: 'important',
        title: '订单已退订',
        summary: `订单 ${order.order_no} 已被 ${user.name} 退订`,
        related_order_id: orderId,
      })
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (err: any) {
    console.error('CANCEL order - uncaught:', err)
    return NextResponse.json({ error: '退订失败：' + (err.message || '未知错误') }, { status: 500 })
  }
}
