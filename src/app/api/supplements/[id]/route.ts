import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status } = await request.json()
  const supplementId = params.id

  let updateData: any = { status }

  if (status === 'confirmed') {
    updateData.confirmed_by = user.id
    updateData.confirmed_at = new Date().toISOString()
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: supplement, error } = await supabase
    .from('supplements')
    .update(updateData)
    .eq('id', supplementId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (status === 'confirmed') {
    await supabase
      .from('orders')
      .update({ installation_status: 'installing' })
      .eq('id', supplement.order_id)
  }

  return NextResponse.json(supplement)
}
