import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser, ADMIN_EMAIL } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SyncUsersButton } from '@/components/settings/sync-users-button'
import { UsersAdminList } from '@/components/settings/users-admin-list'

const roleLabels: Record<string, string> = {
  owner: '老板',
  manager: '店长',
  sales: '导购',
  designer: '设计师',
  installer: '安装/售后',
}

function getRoleLabel(u: { role: string; email?: string | null }): string {
  if (u.role === 'owner' && u.email === ADMIN_EMAIL) return '管理员'
  return roleLabels[u.role] || u.role
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-indigo-100 text-indigo-800',
  sales: 'bg-blue-100 text-blue-800',
  designer: 'bg-green-100 text-green-800',
  installer: 'bg-orange-100 text-orange-800',
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)

  // Only admin can access
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const adminSupabase = await createAdminClient()

  // Fetch all users in admin's organization (for stats)
  const { data: allUsers } = await adminSupabase
    .from('users')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  // Fetch ALL owners across all organizations (for admin to see all stores)
  const { data: allManagers } = await adminSupabase
    .from('users')
    .select('*')
    .eq('role', 'owner')
    .order('created_at', { ascending: false })

  // Fetch ALL users across all organizations (for admin to see all accounts, grouped by owner)
  const { data: allAccounts } = await adminSupabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  // Group staff by organization_id (under their owner)
  const staffByOrg: Record<string, any[]> = {}
  for (const u of (allAccounts || [])) {
    if (u.role !== 'owner') {
      if (!staffByOrg[u.organization_id]) staffByOrg[u.organization_id] = []
      staffByOrg[u.organization_id].push(u)
    }
  }

  // Fetch stats for ALL users
  const { data: statsData } = await adminSupabase
    .from('users')
    .select('role')

  const stats = {
    total: statsData?.length || 0,
    owner: statsData?.filter(u => u.role === 'owner').length || 0,
    manager: statsData?.filter(u => u.role === 'manager').length || 0,
    sales: statsData?.filter(u => u.role === 'sales').length || 0,
    designer: statsData?.filter(u => u.role === 'designer').length || 0,
    installer: statsData?.filter(u => u.role === 'installer').length || 0,
  }

  // Fetch recent activity (last 7 days logins - ALL users)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: recentUsers } = await adminSupabase
    .from('users')
    .select('*')
    .gt('updated_at', weekAgo.toISOString())
    .order('updated_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">管理员面板</h1>
          <p className="text-muted-foreground">系统全局管理与数据概览</p>
        </div>
        <SyncUsersButton />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">账号总数</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">导购</p>
            <p className="text-3xl font-bold text-blue-600">{stats.sales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">店长</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.manager}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">设计师</p>
            <p className="text-3xl font-bold text-green-600">{stats.designer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">安装/售后</p>
            <p className="text-3xl font-bold text-orange-600">{stats.installer}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">老板总数</p>
            <p className="text-3xl font-bold text-purple-600">{allManagers?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 老板账号管理 */}
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>老板账号管理</CardTitle>
            <Link href="/settings/admin/managers/new">
              <Button size="sm">+ 添加老板</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {allManagers && allManagers.length > 0 ? (
              <div className="space-y-3">
                {allManagers.map((mgr: any) => (
                  <div key={mgr.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{mgr.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {mgr.email || '无邮箱'} {mgr.phone ? `· ${mgr.phone}` : ''}
                      </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">{getRoleLabel(mgr)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无老板账号</p>
            )}
          </CardContent>
        </Card>

        {/* 活跃账号 */}
        <Card>
          <CardHeader>
            <CardTitle>近7日活跃</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{recentUsers?.length || 0}</p>
            <p className="text-sm text-muted-foreground">个账号</p>
          </CardContent>
        </Card>
      </div>

      {/* 全部账号列表 */}
      <Card>
        <CardHeader>
          <CardTitle>全部账号</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersAdminList owners={allManagers || []} staffByOrg={staffByOrg} />
        </CardContent>
      </Card>
    </div>
  )
}
