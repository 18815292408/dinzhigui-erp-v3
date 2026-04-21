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

  const { estimated_shipment_date, installer_id } = await request.json()
  const orderId = params.id

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'in_install',
      estimated_shipment_date,
      assigned_installer: installer_id,
      installation_status: 'pending_ship',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_designer', user.id)
    .eq('status', 'pending_shipment')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (installer_id) {
    await supabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: installer_id,
      type: 'new_install',
      priority: 'urgent',
      title: '新订单待安装',
      summary: `订单 ${order.order_no} (${order.customer_name}) 已分配给您，请确认接单`,
      related_order_id: orderId
    })
  }

  return NextResponse.json(order)
}
