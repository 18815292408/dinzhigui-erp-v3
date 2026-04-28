import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/types'
import { requireSession } from '@/lib/auth'

// Delete user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  if (session.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: '只有管理员才能执行此操作' }, { status: 401 })
  }

  // Cannot delete yourself
  if (session.id === params.id) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // Check if target is an owner — if so, cascade delete all staff in same org
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', params.id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  let userIdsToDelete: string[] = [params.id]

  if (targetUser.role === 'owner') {
    // Find all staff in this organization
    const { data: staff } = await adminSupabase
      .from('users')
      .select('id')
      .eq('organization_id', targetUser.organization_id)
      .neq('id', params.id)

    for (const s of staff || []) {
      userIdsToDelete.push(s.id)
    }
  }

  console.log('Deleting users:', userIdsToDelete)

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  for (const userId of userIdsToDelete) {
    // Clear all references across all related tables
    await adminSupabase
      .from('orders')
      .update({ assigned_designer: null })
      .eq('assigned_designer', userId)

    await adminSupabase
      .from('orders')
      .update({ assigned_installer: null })
      .eq('assigned_installer', userId)

    await adminSupabase
      .from('orders')
      .update({ created_by: null })
      .eq('created_by', userId)

    // Clear notifications references
    await adminSupabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)

    // Delete related designs
    await adminSupabase
      .from('designs')
      .delete()
      .eq('created_by', userId)

    // Delete related installations
    await adminSupabase
      .from('installations')
      .delete()
      .eq('assigned_to', userId)

    // Delete from users table
    await adminSupabase
      .from('users')
      .delete()
      .eq('id', userId)

    // Delete from Auth
    await fetch(`${adminUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': adminKey as string,
        'Authorization': `Bearer ${adminKey}`,
      } as HeadersInit,
    })
  }

  return NextResponse.json({ success: true })
}

// Update user role/name/expires_at
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  if (session.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: '只有管理员才能执行此操作' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const body = await request.json()
  const { role, display_name, expires_at, role_limits } = body

  const validRoles = ['owner', 'manager', 'sales', 'designer', 'installer']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: '无效的角色' }, { status: 400 })
  }

  // Validate expires_at format if provided
  if (expires_at !== null && expires_at !== undefined) {
    if (typeof expires_at === 'string') {
      const date = new Date(expires_at)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: '无效的过期时间格式' }, { status: 400 })
      }
    }
  }

  // Validate role_limits if provided
  if (role_limits !== undefined) {
    if (role_limits !== null && typeof role_limits === 'object') {
      const validLimitRoles = ['manager', 'sales', 'designer', 'installer']
      for (const [r, count] of Object.entries(role_limits)) {
        if (!validLimitRoles.includes(r)) {
          return NextResponse.json({ error: `无效的限额角色: ${r}` }, { status: 400 })
        }
        if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
          return NextResponse.json({ error: `限额值必须是非负整数: ${r}=${count}` }, { status: 400 })
        }
      }
    } else if (role_limits !== null) {
      return NextResponse.json({ error: '无效的限额格式' }, { status: 400 })
    }
  }

  const updates: any = {}
  if (role) updates.role = role
  if (display_name !== undefined) updates.display_name = display_name
  if (expires_at !== undefined) updates.expires_at = expires_at
  if (role_limits !== undefined) updates.role_limits = role_limits
  updates.updated_at = new Date().toISOString()

  // Fetch target user to check role for cascade
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', params.id)
    .single()

  // Only owners can have role_limits
  if (role_limits !== undefined && targetUser && targetUser.role !== 'owner') {
    return NextResponse.json({ error: '仅老板账号可设置创建限额' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('users')
    .update(updates)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Cascade: when owner's expires_at changes, update all users in same org
  if (expires_at !== undefined && targetUser && targetUser.role === 'owner') {
    const { error: cascadeError } = await adminSupabase
      .from('users')
      .update({ expires_at, updated_at: new Date().toISOString() })
      .eq('organization_id', targetUser.organization_id)

    if (cascadeError) {
      console.error('Cascade expiry error:', cascadeError)
    }
  }

  return NextResponse.json({ success: true })
}
