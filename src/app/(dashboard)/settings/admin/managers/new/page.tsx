import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserForm } from '@/components/settings/user-form'
import { BackButton } from '@/components/ui/back-button'
import { parseSessionUser, ADMIN_EMAIL } from '@/lib/types'

export default async function NewManagerPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    redirect('/login')
  }

  // Only admin can create owners
  if (user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/settings/admin" label="返回管理员面板" />
        <h1 className="text-2xl font-semibold mt-2">添加老板</h1>
        <p className="text-muted-foreground">创建新的老板账号</p>
      </div>
      <UserForm currentUserRole={user.role} currentUserId={user.id} organizationId={user.organization_id} isManagerCreation />
    </div>
  )
}
