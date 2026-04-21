import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!['owner', 'manager'].includes(userData?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orderId = params.id

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'pending_shipment',
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('organization_id', userData?.organization_id)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (order.assigned_designer) {
    await supabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.assigned_designer,
      type: 'payment_confirmed',
      priority: 'urgent',
      title: '订单已打款',
      summary: `订单 ${order.order_no} 已打款，请填写出货时间`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
