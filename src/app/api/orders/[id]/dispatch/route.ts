import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

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
  const { designer_id } = await request.json()
  const orderId = params.id

  const { data: order, error } = await adminSupabase
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
  await adminSupabase.from('notifications').insert({
    organization_id: order.organization_id,
    user_id: designer_id,
    type: 'new_order',
    priority: 'urgent',
    title: '新订单派发',
    summary: `客户 ${order.customer_name} 的订单已派给您，请及时接单`,
    related_order_id: orderId
  })

  // 更新客户状态为有进行中订单
  await adminSupabase
    .from('customers')
    .update({
      has_active_order: true,
      order_stage: 'pending_design'
    })
    .eq('id', order.customer_id)

  return NextResponse.json(order)
}
