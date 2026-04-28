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

  if (!['owner', 'manager', 'designer'].includes(user.role)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const { design_due_days } = await request.json()
  const orderId = params.id

  if (![7, 10, 12, 15].includes(design_due_days)) {
    return NextResponse.json({ error: '设计周期必须是 7、10、12 或 15 天' }, { status: 400 })
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + design_due_days)

  let query = adminSupabase
    .from('orders')
    .update({
      status: 'designing',
      design_due_days,
      design_due_date: dueDate.toISOString().slice(0, 10),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'pending_design')

  if (user.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  }

  const { data: order, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  // 接单成功后自动创建设计记录
  const { error: designError } = await adminSupabase
    .from('designs')
    .insert({
      organization_id: order.organization_id,
      order_id: orderId,
      customer_id: order.customer_id || null,
      created_by: user.id,
      status: 'draft',
      title: `${order.customer_name || '未知'} - 设计方案`,
      attachments: '[]',
    })

  if (designError) {
    console.error('Create design on accept error:', designError)
  }

  return NextResponse.json(order)
}
