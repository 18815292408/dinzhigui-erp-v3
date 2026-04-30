// Owner updates staff user info (password, name, email, phone, role)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  // Only owner can modify staff
  if (session.role !== 'owner') {
    return NextResponse.json({ error: '只有老板才能修改员工信息' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()

  // Fetch target user
  const { data: targetUser, error: targetError } = await adminSupabase
    .from('users')
    .select('id, role, organization_id, email, phone')
    .eq('id', params.id)
    .single()

  if (targetError || !targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // Cannot modify cross-organization users
  if (targetUser.organization_id !== session.organization_id) {
    return NextResponse.json({ error: '无权修改其他组织的员工' }, { status: 403 })
  }

  const body = await request.json()
  const { display_name, email, phone, role, password } = body

  // Owner accounts: can only edit self, and only password
  if (targetUser.role === 'owner') {
    if (targetUser.id !== session.id) {
      return NextResponse.json({ error: '不能修改其他老板账号信息' }, { status: 403 })
    }
    // Self-edit: only password is allowed
    if (display_name !== undefined || email !== undefined || phone !== undefined || role !== undefined) {
      return NextResponse.json({ error: '只能修改自己的密码' }, { status: 403 })
    }
  }

  // Validate: email or phone required
  const newEmail = email !== undefined ? (email || null) : targetUser.email
  const newPhone = phone !== undefined ? (phone || null) : targetUser.phone
  if (!newEmail && !newPhone) {
    return NextResponse.json({ error: '邮箱和手机号不能同时为空' }, { status: 400 })
  }

  // Validate role
  const validRoles = ['manager', 'sales', 'designer', 'installer']
  if (role !== undefined && !validRoles.includes(role)) {
    return NextResponse.json({ error: '无效的角色' }, { status: 400 })
  }

  // Validate password
  if (password && password.length < 6) {
    return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
  }

  // 1. Update public.users table
  const updates: any = {
    updated_at: new Date().toISOString(),
  }
  if (display_name !== undefined) updates.display_name = display_name
  if (email !== undefined) updates.email = email || null
  if (phone !== undefined) updates.phone = phone || null
  if (role !== undefined) updates.role = role

  const { error: updateError } = await adminSupabase
    .from('users')
    .update(updates)
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 2. Update auth user (email and/or password) via admin API
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminKey) {
    return NextResponse.json({ error: '服务器配置错误' }, { status: 500 })
  }

  const authUpdates: any = {}
  if (email !== undefined) authUpdates.email = email || undefined
  if (password) authUpdates.password = password

  if (Object.keys(authUpdates).length > 0) {
    const authRes = await fetch(`${adminUrl}/auth/v1/admin/users/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': adminKey,
        'Authorization': `Bearer ${adminKey}`,
      },
      body: JSON.stringify(authUpdates),
    })

    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}))
      console.error('Auth update error:', err)
      return NextResponse.json({ error: err.msg || err.message || '更新认证信息失败' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
