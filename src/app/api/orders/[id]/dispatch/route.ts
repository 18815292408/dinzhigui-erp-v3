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

  const { designer_id } = await request.json()
  const orderId = params.id

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      assigned_designer: designer_id,
      status: 'pending_design',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('created_by', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create urgent notification for designer
  await supabase.from('notifications').insert({
    organization_id: order.organization_id,
    user_id: designer_id,
    type: 'new_order',
    priority: 'urgent',
    title: '新订单派发',
    summary: `客户 ${order.customer_name} 的订单已派给您，请及时接单`,
    related_order_id: orderId
  })

  return NextResponse.json(order)
}
