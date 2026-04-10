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
  const { data, error } = await adminSupabase
    .from('designs')
    .select('*, customers(id, name, phone, house_type)')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

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
  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('designs')
    .insert({
      organization_id: user.organization_id,
      created_by: user.id,
      customer_id: body.customer_id || null,
      title: body.title || '',
      room_count: body.room_count || null,
      total_area: body.total_area || null,
      description: body.description || null,
      final_price: body.price ? parseFloat(body.price) : null,
      status: 'draft',
      attachments: '[]',
    })
    .select('*, customers(id, name, phone, house_type)')
    .single()

  if (error) {
    console.error('Create design error:', error)
    return NextResponse.json({ error: '创建方案失败' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
