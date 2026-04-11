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
  // 1. 待安装 → 进行中：需要设置预约日期
  if (currentStatus === 'pending' && newStatus === 'in_progress') {
    if (!body.scheduled_date) {
      return NextResponse.json({ error: '开始安装前必须设置预约日期' }, { status: 400 })
    }
  }

  // 2. 进行中 → 已完成：需要填写安装反馈
  if (currentStatus === 'in_progress' && newStatus === 'completed') {
    if (!body.feedback) {
      return NextResponse.json({ error: '完成安装前必须填写安装反馈' }, { status: 400 })
    }
  }

  // 3. 不能从已完成或已取消改回其他状态
  if ((currentStatus === 'completed' || currentStatus === 'cancelled') && newStatus !== currentStatus) {
    return NextResponse.json({ error: '已完成或已取消的安装单不能更改状态' }, { status: 400 })
  }

  // 4. 不能跳过状态（pending不能直接到completed）
  const validFlows: Record<string, string[]> = {
    pending: ['in_progress', 'cancelled'],
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
  const { error } = await adminSupabase
    .from('installations')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (error) {
    console.error('Delete installation error:', error)
    return NextResponse.json({ error: '删除安装单失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
