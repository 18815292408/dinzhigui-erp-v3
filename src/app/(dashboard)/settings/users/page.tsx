import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { UserList } from '@/components/settings/user-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { parseSessionUser } from '@/lib/types'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  const user = parseSessionUser(sessionCookie?.value || '')
  const canCreateUser = user && ['owner'].includes(user.role)

  const adminSupabase = await createAdminClient()
  const { data: users } = user
    ? await adminSupabase
        .from('users')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">账号管理</h1>
          <p className="text-muted-foreground">管理门店员工账号</p>
        </div>
        {canCreateUser && (
          <Link href="/settings/users/new">
            <Button>+ 添加员工</Button>
          </Link>
        )}
      </div>

      <UserList users={users || []} currentUserId={user?.id} />
    </div>
  )
}
