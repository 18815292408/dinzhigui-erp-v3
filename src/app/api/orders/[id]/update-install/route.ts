import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { installation_status } = await request.json()
  const orderId = params.id

  const { data: currentOrder } = await supabase
    .from('orders')
    .select('installation_status, assigned_designer, organization_id, order_no')
    .eq('id', orderId)
    .eq('assigned_installer', user.id)
    .single()

  if (!currentOrder) {
    return NextResponse.json({ error: 'Order not found or not assigned' }, { status: 404 })
  }

  const currentIndex = INSTALLATION_STATUS_FLOW.indexOf(currentOrder.installation_status)
  const newIndex = INSTALLATION_STATUS_FLOW.indexOf(installation_status)

  if (newIndex < currentIndex && installation_status !== 'supplement_pending') {
    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      installation_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_installer', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (installation_status === 'supplement_pending') {
    await supabase.from('notifications').insert({
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
