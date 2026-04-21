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
