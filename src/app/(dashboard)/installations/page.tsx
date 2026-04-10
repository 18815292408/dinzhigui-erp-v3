import { cookies } from 'next/headers'
import { InstallationList } from '@/components/installations/installation-list'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getInstallations() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()
  // 只获取未完成的安装单（待安装、进行中）
  const { data } = await adminSupabase
    .from('installations')
    .select(`
      *,
      customers(id, name, phone, house_type),
      designs(id, title, final_price)
    `)
    .eq('organization_id', user.organization_id)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })

  return data || []
}

// Demo data
const DEMO_INSTALLATIONS = [
  {
    id: 'demo-installation-1',
    status: 'pending',
    scheduled_date: null,
    feedback: null,
    customers: { name: '张三', phone: '13800138000' },
    designs: { title: 'XX小区A户型设计方案' },
    created_at: new Date().toISOString(),
  },
]

export default async function InstallationsPage() {
  let installations: any[] = await getInstallations()

  if (installations.length === 0) {
    installations = DEMO_INSTALLATIONS
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">安装管理</h1>
        <p className="text-muted-foreground">查看和处理安装单</p>
      </div>

      <InstallationList installations={installations} />
    </div>
  )
}
