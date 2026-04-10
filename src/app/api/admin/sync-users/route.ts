// Sync users from Auth to public.users table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function POST() {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Check if current user is owner
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const currentUser = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  if (!currentUser || currentUser.role !== 'owner') {
    return NextResponse.json({ error: '只有管理员才能执行此操作' }, { status: 401 })
  }

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminKey) {
    return NextResponse.json({ error: '服务器配置错误' }, { status: 500 })
  }

  // Fetch all users from Auth
  const authResponse = await fetch(`${adminUrl}/auth/v1/admin/users`, {
    headers: {
      'apikey': adminKey,
      'Authorization': `Bearer ${adminKey}`,
    },
  })

  if (!authResponse.ok) {
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }

  const authData = await authResponse.json()
  const authUsers = authData.users || []

  const organizationId = currentUser.organization_id
  let synced = 0
  let errors = 0
  let skipped = 0

  for (const authUser of authUsers) {
    const displayName = authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || '未知'
    const phone = authUser.user_metadata?.phone || null
    const email = authUser.email || null

    // Check if user already exists in public.users
    const { data: existing } = await adminSupabase
      .from('users')
      .select('id, organization_id')
      .eq('id', authUser.id)
      .single()

    if (existing) {
      // Skip if user belongs to a different organization
      if (existing.organization_id !== organizationId) {
        skipped++
        continue
      }
      // Update existing user - only update non-role fields to preserve existing role
      const { error } = await adminSupabase
        .from('users')
        .update({
          display_name: displayName,
          phone: phone,
          email: email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id)

      if (error) {
        console.error('Update error:', error)
        errors++
      } else {
        synced++
      }
    } else {
      // Insert new user with default role 'sales'
      const { error } = await adminSupabase
        .from('users')
        .insert({
          id: authUser.id,
          email: email,
          display_name: displayName,
          phone: phone,
          role: 'sales',
          organization_id: organizationId,
        })

      if (error) {
        console.error('Insert error:', error)
        errors++
      } else {
        synced++
      }
    }
  }

  return NextResponse.json({
    success: true,
    total: authUsers.length,
    synced,
    errors,
    skipped,
  })
}
