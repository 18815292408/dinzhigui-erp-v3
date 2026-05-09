// Installations API - Supabase
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

  // 安装人员只能看自己负责的安装记录
  // 销售/设计师需要通过订单关联过滤，先获取相关订单ID
  let orderIds: string[] | null = null
  if (user.role === 'sales' || user.role === 'designer') {
    let orderQuery = adminSupabase
      .from('orders')
      .select('id')
      .eq('organization_id', user.organization_id)

    if (user.role === 'sales') {
      orderQuery = orderQuery.eq('created_by', user.id)
    } else if (user.role === 'designer') {
      orderQuery = orderQuery.eq('assigned_designer', user.id)
    }

    const { data: orders } = await orderQuery
    orderIds = (orders || []).map((o: any) => o.id)

    // 如果没有相关订单，直接返回空数组
    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
  }

  let query = adminSupabase
    .from('installations')
    .select(`
      *,
      orders(order_no)
    `)
    .eq('organization_id', user.organization_id)

  if (user.role === 'installer') {
    query = query.eq('assigned_to', user.id)
  } else if (orderIds && orderIds.length > 0) {
    query = query.in('order_id', orderIds)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Get installations error:', error)
    return NextResponse.json({ error: '获取安装单列表失败' }, { status: 500 })
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
  const adminSupabase = await createAdminClient()

  // 如果提供了 design_id，仅验证设计方案存在即可（不再要求 confirmed）
  if (body.design_id) {
    const { data: design, error: designError } = await adminSupabase
      .from('designs')
      .select('id')
      .eq('id', body.design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json({ error: '设计方案不存在' }, { status: 400 })
    }
  }

  const { data, error } = await adminSupabase
    .from('installations')
    .insert({
      organization_id: user.organization_id,
      order_id: body.order_id || null,
      customer_id: body.customer_id || null,
      design_id: body.design_id || null,
      assigned_to: body.assigned_to || null,
      status: 'pending',
      scheduled_date: body.scheduled_date || null,
      completed_at: null,
      feedback: null,
      issues: '[]',
    })
    .select()
    .single()

  if (error) {
    console.error('Create installation error:', error)
    return NextResponse.json({ error: '创建安装单失败' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
