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
  after_sales: { label: '售后中', statuses: ['in_after_sales'] },
}

export function CustomersPageClient({ customers, userRole }: { customers: CustomersData; userRole: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTab = searchParams.get('tab') === 'followup' ? 'followup' : 'create'
  const stageParam = searchParams.get('stage')
  const currentStage = stageParam && STAGE_FILTERS[stageParam] ? stageParam : 'all'
  const isPersonalMode = searchParams.get('personal') === 'true'
  const isManager = userRole === 'manager'

  const handleTabChange = useCallback((newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newTab === 'followup') {
      params.set('tab', 'followup')
    } else {
      params.delete('tab')
      params.delete('stage')
    }
    // 切换标签页时保留 personal 参数
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

  const handlePersonalModeToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (isPersonalMode) {
      params.delete('personal')
    } else {
      params.set('personal', 'true')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams, isPersonalMode])

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
          <TabsTrigger
            value="create"
            className="aria-selected:bg-blue-600 aria-selected:text-white aria-selected:shadow-sm px-4"
          >
            订单创建
          </TabsTrigger>
          <TabsTrigger
            value="followup"
            className="aria-selected:bg-orange-500 aria-selected:text-white aria-selected:shadow-sm px-4"
          >
            订单跟进
            {customers.withOrders.length > 0 && (
              <Badge className="ml-2 bg-red-500 aria-selected:bg-white aria-selected:text-red-600">
                {customers.withOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isManager && (
        <div className="flex items-center gap-3 py-2">
          <button
            onClick={handlePersonalModeToggle}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isPersonalMode ? 'bg-blue-600' : 'bg-gray-300'
            )}
            aria-pressed={isPersonalMode}
            aria-label={isPersonalMode ? '只看我的订单' : '显示全部订单'}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                isPersonalMode ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <span className={cn(
            'text-sm font-medium transition-colors duration-200',
            isPersonalMode ? 'text-blue-600' : 'text-gray-600'
          )}>
            {isPersonalMode ? '只看我的订单' : '显示全部订单'}
          </span>
        </div>
      )}

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
                  'px-3 py-1.5 text-sm rounded-full transition-colors font-medium',
                  currentStage === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
