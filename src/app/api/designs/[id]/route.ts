// Design Detail API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { requireSession } from '@/lib/auth'

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
    .from('designs')
    .select(`
      *,
      customers(id, name, phone, house_type),
      orders(id, order_no, status, customer_name, customer_phone, signed_amount)
    `)
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    return NextResponse.json({ error: '方案不存在' }, { status: 404 })
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

  // 将前端传入的 price 映射到数据库的 price
  if (body.price !== undefined) {
    body.price = body.price ? parseFloat(body.price) : null
  }

  // Remove fields that shouldn't be updated directly
  const { id, organization_id, created_at, created_by, customers, orders, ...updates } = body

  const { data, error } = await adminSupabase
    .from('designs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .select(`
      *,
      customers(id, name, phone, house_type),
      orders(id, order_no, status, customer_name, signed_amount)
    `)
    .single()

  if (error) {
    console.error('Update design error:', error)
    return NextResponse.json({ error: '更新方案失败' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: '方案不存在' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const user = session
  const adminSupabase = await createAdminClient()

  // 店长/老板不受限制
  const canBypassAll = ['owner', 'manager'].includes(user.role)

  // 先获取设计方案，检查所有权
  const { data: design } = await adminSupabase
    .from('designs')
    .select('created_by, order_id')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!design) {
    return NextResponse.json({ error: '设计方案不存在' }, { status: 404 })
  }

  if (!canBypassAll) {
    // 非店长/老板：设计师角色只能删自己创建的设计方案
    if (user.role === 'designer') {
      if (design.created_by !== user.id) {
        return NextResponse.json({ error: '只能删除自己创建的设计方案' }, { status: 403 })
      }
    } else {
      // 非设计师角色不允许删设计方案
      return NextResponse.json({ error: '无权删除设计方案' }, { status: 403 })
    }
  }

  // 检查是否有安装记录（所有角色都检查，避免 FK 约束报错）
  const { data: installations } = await adminSupabase
    .from('installations')
    .select('id')
    .eq('design_id', params.id)
    .limit(1)

  if (installations && installations.length > 0) {
    return NextResponse.json(
      { error: '该设计方案还有安装记录，请到安装管理删除安装记录后再试' },
      { status: 400 }
    )
  }

  const { error } = await adminSupabase
    .from('designs')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Delete design error:', error)
    return NextResponse.json({ error: '删除方案失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
