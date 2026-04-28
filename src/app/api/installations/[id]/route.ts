// Installation Detail API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
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
    .from('installations')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (error) {
    return NextResponse.json({ error: '安装单不存在' }, { status: 404 })
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

  // 获取当前安装单状态
  const { data: current, error: fetchError } = await adminSupabase
    .from('installations')
    .select('status')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: '安装单不存在' }, { status: 404 })
  }

  const newStatus = body.status
  const currentStatus = current.status

  // 工作流程校验
  // 1. 进行中 → 已完成：需要填写安装反馈
  if (currentStatus === 'in_progress' && newStatus === 'completed') {
    if (!body.feedback) {
      return NextResponse.json({ error: '完成安装前必须填写安装反馈' }, { status: 400 })
    }
  }

  // 2. 不能从已完成或已取消改回其他状态
  if ((currentStatus === 'completed' || currentStatus === 'cancelled') && newStatus !== currentStatus) {
    return NextResponse.json({ error: '已完成或已取消的安装单不能更改状态' }, { status: 400 })
  }

  // 3. 不能跳过状态（pending不能直接到completed，但允许通过确认到货直接跳到进行中）
  const validFlows: Record<string, string[]> = {
    pending: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
  }
  if (newStatus !== currentStatus && !validFlows[currentStatus]?.includes(newStatus)) {
    return NextResponse.json({ error: `不能从${currentStatus}直接改为${newStatus}` }, { status: 400 })
  }

  // Remove fields that shouldn't be updated directly
  const { id, organization_id, created_at, created_by, ...updates } = body

  const { data, error } = await adminSupabase
    .from('installations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) {
    console.error('Update installation error:', error)
    return NextResponse.json({ error: '更新安装单失败' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: '安装单不存在' }, { status: 404 })
  }

  // 如果安装单完成，重置客户状态
  if (newStatus === 'completed' && currentStatus !== 'completed') {
    // 获取安装单关联的订单，找到对应客户
    const { data: installation } = await adminSupabase
      .from('installations')
      .select('customer_id, organization_id')
      .eq('id', params.id)
      .single()

    if (installation?.customer_id) {
      await adminSupabase
        .from('customers')
        .update({
          has_active_order: false,
          order_stage: 'completed'
        })
        .eq('id', installation.customer_id)
    }
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

  // 店长/老板不受限制
  const canBypassAll = ['owner', 'manager'].includes(user.role)

  // 先获取安装记录，检查所有权
  const adminSupabase = await createAdminClient()
  const { data: installation } = await adminSupabase
    .from('installations')
    .select('created_by')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!installation) {
    return NextResponse.json({ error: '安装记录不存在' }, { status: 404 })
  }

  // 非店长/老板只能删自己创建的安装记录
  if (!canBypassAll) {
    if (user.role === 'installer' && installation.created_by !== user.id) {
      return NextResponse.json({ error: '只能删除自己创建的安装记录' }, { status: 403 })
    }
    // 非安装师角色不允许删安装记录
    if (user.role !== 'installer') {
      return NextResponse.json({ error: '无权删除安装记录' }, { status: 403 })
    }
  }
  // 执行删除
  const { error, count } = await adminSupabase
    .from('installations')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)
    .select('id')

  if (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: '安装记录不存在或无权删除' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
