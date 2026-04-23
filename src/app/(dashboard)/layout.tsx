import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { parseSessionUser } from '@/lib/types'

// 从Cookie解析session
async function getSession(): Promise<import('@/lib/types').SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return null
    }

    return parseSessionUser(sessionCookie.value)
  } catch {
    return null
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-apple-gray-50">
      <Sidebar userRole={user.role} />
      <div className="pl-[280px]">
        <Header userName={user.name} userRole={user.role} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
