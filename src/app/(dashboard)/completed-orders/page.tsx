import { cookies } from 'next/headers'
import { InstallationList } from '@/components/installations/installation-list'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getCompletedInstallations() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()
  // 只获取已完成的安装单（已完成、已取消）
  const { data } = await adminSupabase
    .from('installations')
    .select(`
      *,
      customers(id, name, phone, house_type),
      designs(id, title, final_price)
    `)
    .eq('organization_id', user.organization_id)
    .in('status', ['completed', 'cancelled'])
    .order('updated_at', { ascending: false })

  return data || []
}

export default async function CompletedInstallationsPage() {
  const installations = await getCompletedInstallations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">已完成订单</h1>
        <p className="text-muted-foreground">查看已完成的安装订单</p>
      </div>

      {installations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无已完成订单
        </div>
      ) : (
        <InstallationList installations={installations} />
      )}
    </div>
  )
}
