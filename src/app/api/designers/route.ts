import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organization_id')

  if (!organizationId) {
    return NextResponse.json({ error: '缺少 organization_id 参数' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('users')
    .select('id, display_name')
    .eq('role', 'designer')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('获取设计师列表失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const designers = (data || []).map((u: any) => ({
    id: u.id,
    name: u.display_name || '未知',
  }))

  return NextResponse.json(designers)
}
