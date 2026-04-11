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
  const { data, error } = await adminSupabase
    .from('installations')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

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

  // 校验：如果提供了design_id，必须确保设计方案已确认才能创建安装单
  if (body.design_id) {
    const { data: design, error: designError } = await adminSupabase
      .from('designs')
      .select('status')
      .eq('id', body.design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json({ error: '设计方案不存在' }, { status: 400 })
    }

    if (design.status !== 'confirmed') {
      return NextResponse.json({ error: '只有已确认的设计方案才能创建安装单' }, { status: 400 })
    }
  }

  const { data, error } = await adminSupabase
    .from('installations')
    .insert({
      organization_id: user.organization_id,
      customer_id: body.customer_id || null,
      design_id: body.design_id || null,
      assigned_to: null,
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
