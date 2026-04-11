import { cookies } from 'next/headers'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel'
import { TimeFilter } from './time-filter'
import { Users, FileText, Wrench, CheckCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getDashboardData() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return { userRole: null }
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return { userRole: null }
  }

  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id

  // 并行查询所有数据
  const [
    customersResult,
    designsResult,
    activeInstallationsResult,
    completedInstallationsResult,
    completedCustomerIdsResult,
    recentCustomersResult,
  ] = await Promise.all([
    adminSupabase.from('customers').select('id', { count: 'exact' }).eq('organization_id', orgId),
    adminSupabase.from('designs').select('id', { count: 'exact' }).eq('organization_id', orgId),
    adminSupabase.from('installations').select('id', { count: 'exact' }).eq('organization_id', orgId).in('status', ['pending', 'in_progress']),
    adminSupabase.from('installations').select('id', { count: 'exact' }).eq('organization_id', orgId).in('status', ['completed', 'cancelled']),
    adminSupabase.from('installations').select('customer_id').eq('organization_id', orgId).in('status', ['completed', 'cancelled']).not('customer_id', 'is', null),
    adminSupabase
      .from('customers')
      .select('id, name, intention_level, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // 过滤掉已完成订单的客户
  const completedCustomerIds = (completedCustomerIdsResult.data || []).map((i: any) => i.customer_id)
  const recentCustomers = (recentCustomersResult.data || []).filter((c: any) => !completedCustomerIds.includes(c.id)).slice(0, 5)

  const customerCount = customersResult.count || 0
  const designCount = designsResult.count || 0
  const activeInstallationCount = activeInstallationsResult.count || 0
  const completedInstallationCount = completedInstallationsResult.count || 0

  return {
    userRole: user.role,
    customerCount,
    designCount,
    activeInstallationCount,
    completedInstallationCount,
    recentCustomers,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  // 未登录或无数据时使用空数据
  const userRole = data?.userRole ?? 'sales'
  const customerCount = data?.customerCount ?? 0
  const designCount = data?.designCount ?? 0
  const activeInstallationCount = data?.activeInstallationCount ?? 0
  const completedInstallationCount = data?.completedInstallationCount ?? 0
  const recentCustomers = data?.recentCustomers ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-apple-gray-900 tracking-tight">数据看板</h1>
          <p className="text-[15px] text-apple-gray-500 mt-1">了解门店运营状况</p>
        </div>
        <TimeFilter />
      </div>

      {/* Stats Cards - Apple style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatsCards
          icon={Users}
          label="客户总数"
          value={customerCount}
          gradient="from-apple-blue to-apple-purple"
          bgGradient="from-apple-blue/10 to-apple-purple/10"
        />
        <StatsCards
          icon={FileText}
          label="设计方案"
          value={designCount}
          gradient="from-apple-green to-green-400"
          bgGradient="from-apple-green/10 to-green-400/10"
        />
        <StatsCards
          icon={Wrench}
          label="安装单"
          value={activeInstallationCount}
          gradient="from-apple-orange to-yellow-400"
          bgGradient="from-apple-orange/10 to-yellow-400/10"
        />
        <StatsCards
          icon={CheckCircle}
          label="已完成订单"
          value={completedInstallationCount}
          gradient="from-apple-gray-500 to-apple-gray-400"
          bgGradient="from-apple-gray-100 to-apple-gray-200"
        />
      </div>

      {/* AI Insights Panel */}
      <AIInsightsPanel userRole={userRole} />

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RecentActivity customers={recentCustomers} />
      </div>
    </div>
  )
}
