// Installation Detail API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

const MAX_RETRIES = 1
const RETRY_DELAY_MS = 500

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

  // 先获取安装记录
  let query = adminSupabase
    .from('installations')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (user.role === 'installer') {
    query = query.eq('assigned_to', user.id)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: '安装单不存在或无权访问' }, { status: 404 })
  }

  // 对于销售/设计师，需要进一步检查关联订单权限
  if (user.role === 'sales' || user.role === 'designer') {
    if (data.order_id) {
      const { data: order } = await adminSupabase
        .from('orders')
        .select('created_by, assigned_designer')
        .eq('id', data.order_id)
        .single()

      const hasPermission = user.role === 'designer'
        ? order?.assigned_designer === user.id
        : order?.created_by === user.id

      if (!hasPermission) {
        return NextResponse.json({ error: '无权访问该安装单' }, { status: 403 })
      }
    }
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

  // 先获取安装记录，检查权限
  let getQuery = adminSupabase
    .from('installations')
    .select('*, orders!inner(created_by, assigned_designer, assigned_installer)')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (user.role === 'installer') {
    getQuery = getQuery.eq('assigned_to', user.id)
  }

  const { data: existingInstallation, error: getError } = await getQuery.single()

  if (getError || !existingInstallation) {
    return NextResponse.json({ error: '安装单不存在或无权修改' }, { status: 404 })
  }

  // 对于销售/设计师，需要进一步检查关联订单权限
  if (user.role === 'sales' || user.role === 'designer') {
    const hasPermission = user.role === 'designer'
      ? existingInstallation.orders?.assigned_designer === user.id
      : existingInstallation.orders?.created_by === user.id

    if (!hasPermission) {
      return NextResponse.json({ error: '无权修改该安装单' }, { status: 403 })
    }
  }

  // 非 owner/manager/installer 不允许修改
  if (!['owner', 'manager', 'installer'].includes(user.role)) {
    return NextResponse.json({ error: '无权修改安装记录' }, { status: 403 })
  }

  // 获取当前安装单状态和反馈
  const current = existingInstallation
  const fetchError = getError

  const newStatus = body.status
  const currentStatus = current.status
  const isChangingStatus = newStatus && newStatus !== currentStatus

  // 工作流程校验（仅当状态变更时进行）
  if (isChangingStatus) {
    // 1. 进行中 → 已完成：至少有一条反馈记录
    if (currentStatus === 'in_progress' && newStatus === 'completed') {
      const feedbackRecords = Array.isArray(body.feedback) ? body.feedback : []
      if (feedbackRecords.length === 0) {
        return NextResponse.json({ error: '完成安装前必须填写安装反馈' }, { status: 400 })
      }
    }

    // 2. 不能从已完成或已取消改回其他状态
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return NextResponse.json({ error: '已完成或已取消的安装单不能更改状态' }, { status: 400 })
    }

    // 3. 不能跳过状态
    const validFlows: Record<string, string[]> = {
      pending: ['in_progress', 'completed', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    }
    if (!validFlows[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({ error: `不能从${currentStatus}直接改为${newStatus}` }, { status: 400 })
    }
  }

  // Remove fields that shouldn't be updated directly
  const { id, organization_id, created_at, created_by, ...updates } = body
  const orgId = user.organization_id

  async function updateWithRetry() {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await adminSupabase
        .from('installations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) {
        const isTimeout =
          error.message?.includes?.('fetch failed') ||
          error.message?.includes?.('ConnectTimeoutError') ||
          error.message?.includes?.('UND_ERR_CONNECT_TIMEOUT')
        if (attempt < MAX_RETRIES && isTimeout) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
          continue
        }
      }
      return { data, error }
    }
    return { data: null, error: new Error('unreachable') }
  }

  const { data, error } = await updateWithRetry()

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
