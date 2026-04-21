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

  const { design_due_days } = await request.json()
  const orderId = params.id

  if (![7, 10, 12, 15].includes(design_due_days)) {
    return NextResponse.json({ error: 'Invalid design_due_days' }, { status: 400 })
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + design_due_days)

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'designing',
      design_due_days,
      design_due_date: dueDate.toISOString().slice(0, 10),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_designer', user.id)
    .eq('status', 'pending_design')
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(order)
}
