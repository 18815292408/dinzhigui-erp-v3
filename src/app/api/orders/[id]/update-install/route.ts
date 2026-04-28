import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

const INSTALLATION_STATUS_FLOW = [
  'pending_ship',
  'shipped',
  'arrived',
  'delivering',
  'installing',
  'supplement_pending',
  'installed'
]

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

  const { installation_status } = await request.json()
  const orderId = params.id

  const { data: currentOrder } = await adminSupabase
    .from('orders')
    .select('installation_status, assigned_installer, assigned_designer, organization_id, order_no')
    .eq('id', orderId)
    .single()

  if (!currentOrder) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  // owner/manager 可以操作，installer 只能操作分配给自己的
  if (!['owner', 'manager'].includes(user.role) && user.role !== 'installer') {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }
  if (user.role === 'installer' && currentOrder.assigned_installer !== user.id) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const currentIndex = INSTALLATION_STATUS_FLOW.indexOf(currentOrder.installation_status)
  const newIndex = INSTALLATION_STATUS_FLOW.indexOf(installation_status)

  if (newIndex < currentIndex && installation_status !== 'supplement_pending') {
    return NextResponse.json({ error: '不能倒退安装状态' }, { status: 400 })
  }

  let query = adminSupabase
    .from('orders')
    .update({
      installation_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

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

  if (installation_status === 'supplement_pending') {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.assigned_designer,
      type: 'supplement_request',
      priority: 'urgent',
      title: '补件申请',
      summary: `订单 ${order.order_no} 有补件需要处理，请立即确认`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
