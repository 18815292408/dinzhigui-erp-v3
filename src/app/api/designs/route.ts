// Designs API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  // 查询设计方案，强制关联订单信息
  let query = adminSupabase
    .from('designs')
    .select(`
      *,
      customers(id, name, phone, house_type),
      orders(id, order_no, status, customer_name, signed_amount)
    `)
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  // 设计师只看到自己参与的设计任务（通过订单关联）
  if (user.role === 'designer') {
    query = query.eq('orders.assigned_designer', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get designs error:', error)
    return NextResponse.json({ error: '获取方案列表失败' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const body = await request.json()
  const { order_id, customer_id, title, room_count, total_area, description, price } = body

  if (!order_id) {
    return NextResponse.json({ error: '必须关联订单（order_id）' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // 验证订单存在且属于当前组织
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, organization_id, customer_id, assigned_designer')
    .eq('id', order_id)
    .single()

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  if (order.organization_id !== user.organization_id) {
    return NextResponse.json({ error: '无权访问该订单' }, { status: 403 })
  }

  // 设计师只能为分配给自己的订单创建设计
  if (user.role === 'designer' && order.assigned_designer !== user.id) {
    return NextResponse.json({ error: '只能为分配给自己的订单创建设计' }, { status: 403 })
  }

  const { data, error } = await adminSupabase
    .from('designs')
    .insert({
      organization_id: user.organization_id,
      order_id,
      customer_id: customer_id || order.customer_id || null,
      created_by: user.id,
      title: title || '',
      room_count: room_count || null,
      total_area: total_area || null,
      description: description || null,
      price: price ? parseFloat(price) : null,
      status: 'draft',
      attachments: '[]',
    })
    .select(`
      *,
      customers(id, name, phone, house_type),
      orders(id, order_no, status, customer_name, signed_amount)
    `)
    .single()

  if (error) {
    console.error('Create design error:', error)
    return NextResponse.json({ error: '创建方案失败' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
