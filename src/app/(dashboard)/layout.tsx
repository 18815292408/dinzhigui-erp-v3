import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { parseSessionUser } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/server'

// 从Cookie解析session并校验过期时间
async function getSessionOrRedirect(): Promise<import('@/lib/types').SessionUser> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    redirect('/login')
  }

  // 检查账号是否已过期，并同步 can_manage_users
  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from('users')
    .select('expires_at, can_manage_users')
    .eq('id', user.id)
    .single()

  if (profile?.expires_at) {
    const expiresAt = new Date(profile.expires_at)
    if (expiresAt < new Date()) {
      // 清除session并重定向到登录页
      redirect('/login')
    }
  }

  // Sync can_manage_users from DB to session
  if (profile?.can_manage_users !== undefined && profile.can_manage_users !== null) {
    user.can_manage_users = profile.can_manage_users
  }

  return user
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionOrRedirect()

  return (
    <div className="min-h-screen bg-apple-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar userRole={user.role} userEmail={user.email} canManageUsers={user.can_manage_users} />
      
      {/* Mobile Sidebar - rendered as a portal-like overlay */}
      <MobileSidebarWrapper 
        userRole={user.role} 
        userEmail={user.email} 
        canManageUsers={user.can_manage_users} 
      />
      
      {/* Main Content Area - responsive padding */}
      <div className="lg:pl-[280px]">
        <HeaderWrapper userName={user.name} userRole={user.role} />
        <main className="p-3 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

// Client component wrapper for Header with mobile menu state
import { MobileSidebarWrapper } from '@/components/layout/mobile-sidebar-wrapper'
import { HeaderWrapper } from '@/components/layout/header-wrapper'
