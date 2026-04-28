// 方案详情页的提交方案接口（转发到订单的 submit-design）
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function POST(
  request: NextRequest,
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

  // 获取设计方案关联的订单
  const { data: design, error: designError } = await adminSupabase
    .from('designs')
    .select('order_id')
    .eq('id', params.id)
    .single()

  if (designError || !design) {
    return NextResponse.json({ error: '设计方案不存在' }, { status: 404 })
  }

  if (!design.order_id) {
    return NextResponse.json({ error: '设计方案未关联订单' }, { status: 400 })
  }

  // 调用订单的提交方案接口（手动转发 cookie）
  const cookieHeader = request.headers.get('cookie') || ''
  const orderRes = await fetch(`${request.nextUrl.origin}/api/orders/${design.order_id}/submit-design`, {
    method: 'POST',
    headers: { cookie: cookieHeader },
  })

  if (!orderRes.ok) {
    const err = await orderRes.json()
    return NextResponse.json({ error: err.error || '提交方案失败' }, { status: orderRes.status })
  }

  return NextResponse.json({ success: true })
}
