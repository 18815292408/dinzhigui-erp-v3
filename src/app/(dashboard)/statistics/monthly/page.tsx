import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseSessionUser } from '@/lib/types'
import { MonthlyStatsClient } from './monthly-stats-client'

export default async function MonthlyStatisticsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)

  // Only owner can access
  if (!user || user.role !== 'owner') {
    redirect('/dashboard')
  }

  return <MonthlyStatsClient />
}
