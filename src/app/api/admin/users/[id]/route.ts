import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

// Delete user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const currentUser = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  if (!currentUser || currentUser.role !== 'owner') {
    return NextResponse.json({ error: '只有管理员才能执行此操作' }, { status: 401 })
  }

  // Cannot delete yourself
  if (currentUser.id === params.id) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // Verify user belongs to same organization before deleting
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  if (targetUser.organization_id !== currentUser.organization_id) {
    return NextResponse.json({ error: '无权删除该用户' }, { status: 403 })
  }

  console.log('Deleting user:', params.id)

  // Delete from users table first
  const { error: deleteError } = await adminSupabase
    .from('users')
    .delete()
    .eq('id', params.id)

  console.log('Delete from users result:', deleteError)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Delete from Auth
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const authRes = await fetch(`${adminUrl}/auth/v1/admin/users/${params.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': adminKey as string,
      'Authorization': `Bearer ${adminKey}`,
    } as HeadersInit,
  })

  console.log('Delete from Auth result:', authRes.status)

  return NextResponse.json({ success: true })
}

// Update user role/name
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const currentUser = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  if (!currentUser || currentUser.role !== 'owner') {
    return NextResponse.json({ error: '只有管理员才能执行此操作' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const body = await request.json()
  const { role, display_name } = body

  // Verify target user belongs to same organization
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  if (targetUser.organization_id !== currentUser.organization_id) {
    return NextResponse.json({ error: '无权修改该用户' }, { status: 403 })
  }

  const validRoles = ['owner', 'manager', 'sales', 'designer', 'installer']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: '无效的角色' }, { status: 400 })
  }

  const updates: any = {}
  if (role) updates.role = role
  if (display_name) updates.display_name = display_name
  updates.updated_at = new Date().toISOString()

  const { error } = await adminSupabase
    .from('users')
    .update(updates)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
