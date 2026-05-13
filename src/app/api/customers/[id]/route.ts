// Customer Detail API - Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { canEditCustomerBasicInfo } from '@/lib/permissions'

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

  let query = adminSupabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  // 销售只能看自己创建的客户
  if (user.role === 'sales') {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: '客户不存在或无权访问' }, { status: 404 })
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

  // 先查询客户，检查权限
  let getQuery = adminSupabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  const { data: existingCustomer, error: getError } = await getQuery.single()

  if (getError || !existingCustomer) {
    return NextResponse.json({ error: '客户不存在或无权修改' }, { status: 404 })
  }

  // 使用权限函数检查是否有权限修改客户基本信息
  if (!canEditCustomerBasicInfo(existingCustomer, user)) {
    return NextResponse.json({ error: '无权修改客户基本信息' }, { status: 403 })
  }

  // 记录原始客户姓名，用于后续同步订单
  const originalName = existingCustomer.name

  // Remove fields that shouldn't be updated directly
  const { id, organization_id, created_at, created_by, ...updates } = body

  // 验证必填字段
  if (updates.name !== undefined && (!updates.name || !updates.name.trim())) {
    return NextResponse.json({ error: '客户姓名不能为空' }, { status: 400 })
  }

  // 验证电话号码格式（如果提供了）
  if (updates.phone !== undefined && updates.phone !== null && updates.phone !== '') {
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(updates.phone)) {
      return NextResponse.json({ error: '电话号码格式不正确' }, { status: 400 })
    }
  }

  // 验证预估价格（如果提供了）
  if (updates.estimated_price !== undefined && updates.estimated_price !== null) {
    const price = parseFloat(updates.estimated_price)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: '预估价格必须是非负数' }, { status: 400 })
    }
    updates.estimated_price = price
  }

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

  // 主动同步：如果客户姓名变更，同步更新 orders 表的 customer_name
  // 注意：数据库触发器也会处理，但这里主动更新可以确保及时性和一致性
  if (updates.name && updates.name !== originalName) {
    const { error: syncError } = await adminSupabase
      .from('orders')
      .update({
        customer_name: updates.name,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_name', originalName)
      .eq('organization_id', user.organization_id)

    if (syncError) {
      console.error('Sync customer name to orders error:', syncError)
      // 不阻断主流程，记录错误即可
    }
  }

  // 主动同步：同步更新关联 designs 表的冗余字段（如果存在）
  if (updates.name || updates.phone || updates.address || updates.house_type) {
    const designUpdates: Record<string, any> = {}
    if (updates.name) designUpdates.customer_name = updates.name
    if (updates.phone) designUpdates.customer_phone = updates.phone
    if (updates.address) designUpdates.customer_address = updates.address
    if (updates.house_type) designUpdates.house_type = updates.house_type

    if (Object.keys(designUpdates).length > 0) {
      const { error: designSyncError } = await adminSupabase
        .from('designs')
        .update({
          ...designUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', params.id)
        .eq('organization_id', user.organization_id)

      if (designSyncError) {
        console.error('Sync customer info to designs error:', designSyncError)
      }
    }
  }

  // 主动同步：同步更新关联 installations 表的冗余字段（如果存在）
  if (updates.name || updates.phone || updates.address) {
    const installUpdates: Record<string, any> = {}
    if (updates.name) installUpdates.customer_name = updates.name
    if (updates.phone) installUpdates.customer_phone = updates.phone
    if (updates.address) installUpdates.customer_address = updates.address

    if (Object.keys(installUpdates).length > 0) {
      const { error: installSyncError } = await adminSupabase
        .from('installations')
        .update({
          ...installUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', params.id)
        .eq('organization_id', user.organization_id)

      if (installSyncError) {
        console.error('Sync customer info to installations error:', installSyncError)
      }
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

  const adminSupabase = await createAdminClient()

  // 先查询客户，检查权限
  let getQuery = adminSupabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (user.role === 'sales') {
    getQuery = getQuery.eq('created_by', user.id)
  }

  const { data: existingCustomer, error: getError } = await getQuery.single()

  if (getError || !existingCustomer) {
    return NextResponse.json({ error: '客户不存在或无权删除' }, { status: 404 })
  }

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
