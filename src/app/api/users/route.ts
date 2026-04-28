// Users API - Server-side user creation with admin privileges
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const currentUser = parseSessionUser(sessionCookie.value)
  if (!currentUser) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  // Only owner and manager can create users
  if (!['owner', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: '无权限创建账号' }, { status: 403 })
  }

  const body = await request.json()
  const { email, phone, password, display_name, role } = body

  // Validate: email or phone required
  if (!email && !phone) {
    return NextResponse.json({ error: '请填写邮箱或手机号（至少填一个）' }, { status: 400 })
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
  }

  if (!display_name) {
    return NextResponse.json({ error: '请填写员工姓名' }, { status: 400 })
  }

  // Only owner can create manager/owner accounts
  if (['owner', 'manager'].includes(role) && currentUser.role !== 'owner') {
    return NextResponse.json({ error: '只有管理员可以创建老板/店长账号' }, { status: 403 })
  }

  // Valid roles for creation
  if (!['owner', 'manager', 'sales', 'designer', 'installer'].includes(role)) {
    return NextResponse.json({ error: '无效的角色' }, { status: 400 })
  }

  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Role limits (filtered by organization)
  const ROLE_LIMITS: Record<string, number> = { owner: 99, manager: 1, sales: 3, designer: 3, installer: 3 }
  const { count } = await adminSupabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', role)
    .eq('organization_id', currentUser.organization_id)

  if ((count || 0) >= ROLE_LIMITS[role]) {
    const roleLabels: Record<string, string> = { manager: '店长', sales: '导购', designer: '设计师', installer: '安装/售后' }
    return NextResponse.json({ error: `${roleLabels[role]}账号已达上限（${ROLE_LIMITS[role]}个）` }, { status: 400 })
  }

  // Create auth user using admin API
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminKey) {
    return NextResponse.json({ error: '服务器配置错误' }, { status: 500 })
  }

  const authResponse = await fetch(`${adminUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': adminKey,
      'Authorization': `Bearer ${adminKey}`,
    },
    body: JSON.stringify({
      // Always provide email - if user didn't give one, use phone-based synthetic email
      email: email || (phone ? `+86${phone.replace(/^\+86/, '')}@phone.local` : undefined),
      password,
      email_confirm: true,
      user_metadata: {
        display_name,
        phone,
      }
    }),
  })

  const createdEmail = email || (phone ? `+86${phone.replace(/^\+86/, '')}@phone.local` : undefined)
  console.log('Creating Auth user with:', { email: createdEmail, phone, passwordLen: password.length })

  if (!authResponse.ok) {
    const err = await authResponse.json()
    return NextResponse.json({ error: err.msg || err.message || '创建用户失败' }, { status: 400 })
  }

  const authUser = await authResponse.json()

  console.log('Auth user created:', authUser.id, 'role:', role)

  // For owner/manager role: create NEW organization (each boss/manager represents a new store)
  // For other roles: use current user's organization
  let organizationId = currentUser.organization_id
  if (role === 'owner' || role === 'manager') {
    // Generate new UUID for new store's organization
    organizationId = crypto.randomUUID()

    // Create organization record first
    const { error: orgError } = await adminSupabase
      .from('organizations')
      .insert({
        id: organizationId,
        name: `${display_name}的门店`,
      })

    if (orgError) {
      console.error('Organization creation error:', orgError)
      // Continue anyway - maybe organizations table doesn't exist or has different schema
    }
  }

  // Upsert: insert or update with correct role and organization
  const { error: profileError } = await adminSupabase
    .from('users')
    .upsert({
      id: authUser.id,
      display_name,
      phone: phone || null,
      email: email || null,
      role,
      organization_id: organizationId,
    })

  if (profileError) {
    console.error('Profile upsert error:', profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  console.log('Profile upsert success, organization:', organizationId)

  return NextResponse.json({ success: true, user: authUser })
}
