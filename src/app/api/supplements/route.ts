import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { order_id, description } = await request.json()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: supplement, error } = await supabase
    .from('supplements')
    .insert({
      organization_id: userData?.organization_id,
      order_id,
      created_by: user.id,
      description,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('assigned_designer, order_no, organization_id')
    .eq('id', order_id)
    .single()

  if (order?.assigned_designer) {
    await supabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.assigned_designer,
      type: 'supplement_request',
      priority: 'urgent',
      title: '补件申请',
      summary: `订单 ${order.order_no} 有补件需要处理：${description.slice(0, 50)}`,
      related_order_id: order_id
    })
  }

  return NextResponse.json(supplement, { status: 201 })
}
