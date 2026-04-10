// Customers API - Supabase
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
    .from('customers')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get customers error:', error)
    return NextResponse.json({ error: '获取客户列表失败' }, { status: 500 })
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

  const { data, error } = await adminSupabase
    .from('customers')
    .insert({
      organization_id: user.organization_id,
      created_by: user.id,
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      house_type: body.house_type || null,
      requirements: body.requirements || null,
      intention_level: null,
      intention_reason: null,
      estimated_price: body.estimated_price ? parseFloat(body.estimated_price) : null,
      ai_analyzed_at: null,
      follow_ups: '[]',
    })
    .select()
    .single()

  if (error) {
    console.error('Create customer error:', error, 'user:', user)
    return NextResponse.json({ error: '创建客户失败', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
