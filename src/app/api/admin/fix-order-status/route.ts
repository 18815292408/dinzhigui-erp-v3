import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const admin = await createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ status: 'designing', updated_at: new Date().toISOString() })
    .eq('status', 'in_design')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}