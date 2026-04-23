import { createClient, createAdminClient } from '@/lib/supabase/server'
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

  const adminSupabase = await createAdminClient()

  // 获取订单并检查签单金额
  const { data: orderToCheck } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!orderToCheck) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  // 检查签单金额
  if (!orderToCheck.signed_amount || orderToCheck.signed_amount <= 0) {
    // 获取订单创建者（导购）的 ID
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('created_by')
      .eq('id', orderToCheck.customer_id)
      .single()

    // 发送通知给导购
    if (customer?.created_by) {
      await adminSupabase.from('notifications').insert({
        organization_id: orderToCheck.organization_id,
        user_id: customer.created_by,
        type: 'signed_amount_required',
        priority: 'urgent',
        title: '签单金额待填写',
        summary: `订单 ${orderToCheck.order_no} 即将下单，请填写签单金额`,
        related_order_id: orderToCheck.id
      })
    }

    return NextResponse.json({
      error: '签单金额未填写，请通知导购填写后再下单'
    }, { status: 400 })
  }

  const { factory_records } = await request.json()
  const orderId = params.id

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'pending_payment',
      factory_records,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_designer', user.id)
    .eq('status', 'pending_order')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(order)
}
