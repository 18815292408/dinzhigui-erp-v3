import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

// 阶段 → 上一个阶段的映射
const REVERT_MAP: Record<string, string> = {
  pending_design: 'pending_dispatch',
  designing: 'pending_design',
  pending_order: 'designing',
  pending_payment: 'pending_order',
  pending_shipment: 'pending_payment',
  in_install: 'pending_shipment',
}

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
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

  // 只有 owner/manager 可以回退
  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '只有店长/老板可以回退订单阶段' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const orderId = params.id

  // 获取完整订单信息
  const { data: currentOrder } = await adminSupabase
    .from('orders')
    .select('id, status, organization_id, assigned_designer, assigned_installer, order_no, customer_name')
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!currentOrder) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  const prevStatus = REVERT_MAP[currentOrder.status]
  if (!prevStatus) {
    return NextResponse.json({ error: '该阶段无法回退' }, { status: 400 })
  }

  const updates: Record<string, any> = {
    status: prevStatus,
    updated_at: new Date().toISOString()
  }

  // 各阶段联动清理
  if (prevStatus === 'pending_dispatch') {
    // 回退到待派单：清除设计师，重置 design 状态
    updates.assigned_designer = null
    await adminSupabase
      .from('designs')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
    if (currentOrder.assigned_designer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_designer,
        type: 'order_reverted',
        priority: 'normal',
        title: '订单已回退',
        summary: `订单 ${currentOrder.order_no} 已被回退至待派单阶段`,
        related_order_id: orderId
      })
    }
  }

  if (prevStatus === 'pending_design') {
    // 回退到待接单：重置 design 状态为草稿，设计师需重新接单
    await adminSupabase
      .from('designs')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
    if (currentOrder.assigned_designer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_designer,
        type: 'order_reverted',
        priority: 'urgent',
        title: '订单已回退，需重新接单',
        summary: `订单 ${currentOrder.order_no} 已回退至待接单，请重新接单`,
        related_order_id: orderId
      })
    }
  }

  if (prevStatus === 'pending_order') {
    // 回退到待下单：重置 design 状态为草稿，设计师需重新提交
    await adminSupabase
      .from('designs')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
    if (currentOrder.assigned_designer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_designer,
        type: 'order_reverted',
        priority: 'urgent',
        title: '订单已回退，需重新提交方案',
        summary: `订单 ${currentOrder.order_no} 已回退至待下单，请重新提交方案`,
        related_order_id: orderId
      })
    }
  }

  if (prevStatus === 'pending_payment') {
    // 回退到待打款：清除出货日期，清除安装师傅，删除安装记录
    updates.estimated_shipment_date = null
    updates.assigned_installer = null
    updates.installation_status = null
    await adminSupabase
      .from('installations')
      .delete()
      .eq('order_id', orderId)
    if (currentOrder.assigned_designer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_designer,
        type: 'order_reverted',
        priority: 'urgent',
        title: '订单已回退至待打款',
        summary: `订单 ${currentOrder.order_no} 客户尚未打款，请等待打款后再操作`,
        related_order_id: orderId
      })
    }
  }

  if (prevStatus === 'pending_shipment') {
    // 回退到待出货：清除出货日期，清除安装师傅，删除安装记录
    updates.estimated_shipment_date = null
    updates.assigned_installer = null
    updates.installation_status = null
    await adminSupabase
      .from('installations')
      .delete()
      .eq('order_id', orderId)
    if (currentOrder.assigned_designer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_designer,
        type: 'order_reverted',
        priority: 'urgent',
        title: '订单已回退至待出货',
        summary: `订单 ${currentOrder.order_no} 已回退，请重新填写出货时间`,
        related_order_id: orderId
      })
    }
    if (currentOrder.assigned_installer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_installer,
        type: 'order_reverted',
        priority: 'normal',
        title: '订单已回退',
        summary: `订单 ${currentOrder.order_no} 已回退，您的安装任务已取消`,
        related_order_id: orderId
      })
    }
  }

  if (prevStatus === 'in_install') {
    // 回退到安装中：删除安装记录，清除安装师傅
    updates.assigned_installer = null
    await adminSupabase
      .from('installations')
      .delete()
      .eq('order_id', orderId)
    if (currentOrder.assigned_installer) {
      await adminSupabase.from('notifications').insert({
        organization_id: currentOrder.organization_id,
        user_id: currentOrder.assigned_installer,
        type: 'order_reverted',
        priority: 'normal',
        title: '订单已回退',
        summary: `订单 ${currentOrder.order_no} 安装任务已取消`,
        related_order_id: orderId
      })
    }
  }

  // 执行回退
  const { data: order, error } = await adminSupabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ...order, message: `已回退到「${STATUS_LABELS[prevStatus]}」` })
}
