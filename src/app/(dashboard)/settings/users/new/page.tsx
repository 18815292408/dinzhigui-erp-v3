import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserForm } from '@/components/settings/user-form'
import { BackButton } from '@/components/ui/back-button'
import { parseSessionUser } from '@/lib/types'

export default async function NewUserPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    redirect('/login')
  }

  // Only owner can create accounts
  if (user.role !== 'owner') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/settings/users" label="返回员工列表" />
        <h1 className="text-2xl font-semibold mt-2">添加员工</h1>
        <p className="text-muted-foreground">创建新的员工账号</p>
      </div>
      <UserForm currentUserRole={user.role} currentUserId={user.id} organizationId={user.organization_id} />
    </div>
  )
}
