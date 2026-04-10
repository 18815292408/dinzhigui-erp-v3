import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { DesignList } from '@/components/designs/design-list'
import { DesignNotice } from '@/components/designs/design-notice'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getDesigns() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()
  // 只显示未确认的方案（草稿、已提交），确认后的方案会创建安装单并从方案管理消失
  const { data } = await adminSupabase
    .from('designs')
    .select('*, customers(id, name, phone, house_type)')
    .eq('organization_id', user.organization_id)
    .in('status', ['draft', 'submitted'])
    .order('created_at', { ascending: false })

  return data || []
}

// Demo data
const DEMO_DESIGNS = [
  {
    id: 'demo-design-1',
    title: 'XX小区A户型设计方案',
    room_count: 3,
    total_area: 120.5,
    price: 150000,
    status: 'submitted',
    customers: { name: '张三' },
    users: { display_name: '演示设计师' },
    created_at: new Date().toISOString(),
  },
]

export default async function DesignsPage() {
  let designs: any[] = []

  designs = await getDesigns()
  if (designs.length === 0) {
    designs = DEMO_DESIGNS
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">方案管理</h1>
          <p className="text-muted-foreground">创建和管理设计方案</p>
        </div>
        <Link href="/designs/new">
          <Button>+ 新建方案</Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <DesignNotice />
      </Suspense>

      <DesignList designs={designs} />
    </div>
  )
}
