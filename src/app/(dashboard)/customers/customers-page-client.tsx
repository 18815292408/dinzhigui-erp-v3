'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CustomerList } from '@/components/customers/customer-list'
import { OrderFollowupList } from '@/components/customers/order-followup-list'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone: string
  house_type: string | null
  orders?: Array<{
    id: string
    order_no: string
    status: string
    signed_amount: number | null
  }>
  intention: string
  created_at: string
  [key: string]: unknown
}

interface CustomersData {
  withoutOrders: Customer[]
  withOrders: Customer[]
}

const STAGE_FILTERS: Record<string, { label: string; statuses: string[] }> = {
  all: { label: '全部', statuses: [] },
  pending_dispatch: { label: '待派单', statuses: ['pending_dispatch'] },
  design: { label: '设计中', statuses: ['pending_design', 'designing'] },
  pending_order: { label: '待下单', statuses: ['pending_order'] },
  pending_payment: { label: '待打款', statuses: ['pending_payment'] },
  install: { label: '出货/安装中', statuses: ['pending_shipment', 'in_install'] },
}

export function CustomersPageClient({ customers }: { customers: CustomersData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTab = searchParams.get('tab') === 'followup' ? 'followup' : 'create'
  const stageParam = searchParams.get('stage')
  const currentStage = stageParam && STAGE_FILTERS[stageParam] ? stageParam : 'all'

  const handleTabChange = useCallback((newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newTab === 'followup') {
      params.set('tab', 'followup')
    } else {
      params.delete('tab')
      params.delete('stage')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const handleStageChange = useCallback((newStage: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'followup')
    if (newStage === 'all') {
      params.delete('stage')
    } else {
      params.set('stage', newStage)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // 每阶段订单数量
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: customers.withOrders.length }
    for (const [key, filter] of Object.entries(STAGE_FILTERS)) {
      if (key === 'all') continue
      counts[key] = customers.withOrders.filter(c =>
        c.orders?.some(o => filter.statuses.includes(o.status))
      ).length
    }
    return counts
  }, [customers.withOrders])

  // 按阶段筛选客户
  const filteredCustomers = currentStage !== 'all' && STAGE_FILTERS[currentStage]
    ? customers.withOrders.filter(c =>
        c.orders?.some(o => STAGE_FILTERS[currentStage].statuses.includes(o.status))
      )
    : customers.withOrders

  return (
    <>
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="create">订单创建</TabsTrigger>
          <TabsTrigger value="followup">
            订单跟进
            {customers.withOrders.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{customers.withOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {currentTab === 'create' ? (
        <CustomerList customers={customers.withoutOrders} />
      ) : (
        <div className="space-y-4">
          {/* 阶段筛选 */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(STAGE_FILTERS).map(([key, filter]) => (
              <button
                key={key}
                onClick={() => handleStageChange(key)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full transition-colors',
                  currentStage === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {filter.label}
                <span className="ml-1 text-xs opacity-70">({stageCounts[key]})</span>
              </button>
            ))}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              当前阶段暂无跟进中的订单
            </div>
          ) : (
            <OrderFollowupList customers={filteredCustomers} />
          )}
        </div>
      )}
    </>
  )
}
