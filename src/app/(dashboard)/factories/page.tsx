import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { FactoryList } from '@/components/factories/factory-list'

async function getFactories() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return { factories: [], user: null }
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return { factories: [], user: null }
  }

  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('factories')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('name')

  if (error) {
    return { factories: [], user }
  }

  return { factories: data || [], user }
}

export default async function FactoriesPage() {
  const { factories, user } = await getFactories()

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">工厂管理</h1>
          <p className="text-sm text-muted-foreground">管理合作的家具工厂</p>
        </div>
      </div>

      <FactoryList
        initialFactories={factories}
        userRole={user?.role}
      />
    </div>
  )
}
