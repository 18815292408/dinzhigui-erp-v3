import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orderId = params.id

  const body = await request.json()
  const { final_order_amount } = body

  const updates: Record<string, unknown> = {
    status: 'pending_order',
    updated_at: new Date().toISOString()
  }
  if (final_order_amount) {
    updates.final_order_amount = parseFloat(final_order_amount)
  }

  const { data: order, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('assigned_designer', user.id)
    .eq('status', 'designing')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (order.created_by) {
    await supabase.from('notifications').insert({
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
