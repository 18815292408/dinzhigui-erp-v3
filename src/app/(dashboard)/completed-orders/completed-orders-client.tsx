'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CompletedOrderList } from '@/components/orders/completed-order-list'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface CompletedOrdersClientProps {
  completedOrders: any[]
  cancelledOrders: any[]
  userRole: string
}

export function CompletedOrdersClient({ completedOrders, cancelledOrders, userRole }: CompletedOrdersClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTab = searchParams.get('tab') === 'cancelled' ? 'cancelled' : 'completed'

  const handleTabChange = useCallback((newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newTab === 'cancelled') {
      params.set('tab', 'cancelled')
    } else {
      params.delete('tab')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <>
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger
            value="completed"
            className="aria-selected:bg-green-600 aria-selected:text-white aria-selected:shadow-sm px-4"
          >
            已完成订单
            {completedOrders.length > 0 && (
              <Badge className="ml-2 bg-green-500 aria-selected:bg-white aria-selected:text-green-600">
                {completedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="cancelled"
            className="aria-selected:bg-red-600 aria-selected:text-white aria-selected:shadow-sm px-4"
          >
            已退订订单
            {cancelledOrders.length > 0 && (
              <Badge className="ml-2 bg-red-500 aria-selected:bg-white aria-selected:text-red-600">
                {cancelledOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {currentTab === 'completed' ? (
          <CompletedOrderList orders={completedOrders} userRole={userRole} status="completed" />
        ) : (
          <CompletedOrderList orders={cancelledOrders} userRole={userRole} status="cancelled" />
        )}
      </div>
    </>
  )
}
