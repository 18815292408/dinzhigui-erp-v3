// Customer Detail API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    return NextResponse.json({ error: '客户不存在' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // Remove fields that shouldn't be updated directly
  const { id, organization_id, created_at, created_by, ...updates } = body

  const { data, error } = await adminSupabase
    .from('customers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: '更新客户信息失败' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: '客户不存在' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  // 检查是否有关联订单
  const { data: relatedOrders } = await adminSupabase
    .from('orders')
    .select('id')
    .eq('customer_id', params.id)
    .limit(1)

  if (relatedOrders && relatedOrders.length > 0) {
    return NextResponse.json(
      { error: '该客户有关联订单，请先删除关联订单后再试' },
      { status: 400 }
    )
  }

  // 清理关联通知
  await adminSupabase
    .from('notifications')
    .update({ related_customer_id: null })
    .eq('related_customer_id', params.id)

  const { error } = await adminSupabase
    .from('customers')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Delete customer error:', error)
    const msg = error.message || ''
    if (msg.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: '该客户有关联数据，请先删除关联订单后再试' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '删除客户失败：' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
