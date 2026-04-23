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

  const orderId = params.id
  const now = new Date()
  const archiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      installation_status: 'installed',
      completed_at: now.toISOString(),
      archived_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_installer', user.id)
    .eq('installation_status', 'installed')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (order.created_by) {
    await supabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: order.created_by,
      type: 'order_completed',
      priority: 'info',
      title: '订单已完成',
      summary: `订单 ${order.order_no} 已安装完成并归档`,
      related_order_id: orderId
    })
  }

  // 将客户的 has_active_order 设为 false
  const adminSupabase = await createAdminClient()
  await adminSupabase
    .from('customers')
    .update({
      has_active_order: false,
      order_stage: 'completed'
    })
    .eq('id', order.customer_id)

  return NextResponse.json({ ...order, archive_month: archiveMonth })
}
