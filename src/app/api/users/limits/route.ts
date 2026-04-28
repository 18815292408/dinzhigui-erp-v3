// GET /api/users/limits - 获取当前组织的角色创建限额
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const currentUser = parseSessionUser(sessionCookie.value)
  if (!currentUser) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const DEFAULT_LIMITS = { manager: 1, sales: 3, designer: 3, installer: 3 }

  const adminSupabase = await createAdminClient()
  const { data: owner } = await adminSupabase
    .from('users')
    .select('role_limits')
    .eq('organization_id', currentUser.organization_id)
    .eq('role', 'owner')
    .single()

  return NextResponse.json({
    limits: { ...DEFAULT_LIMITS, ...(owner?.role_limits as Record<string, number> || {}) },
  })
}
