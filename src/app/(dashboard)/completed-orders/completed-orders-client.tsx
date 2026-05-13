'use client'

import { useCallback, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CompletedOrderList } from '@/components/orders/completed-order-list'
import { OrderExportToolbar } from '@/components/orders/order-export-toolbar'
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
  const currentOrders = currentTab === 'completed' ? completedOrders : cancelledOrders

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const handleTabChange = useCallback((newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newTab === 'cancelled') {
      params.set('tab', 'cancelled')
    } else {
      params.delete('tab')
    }
    router.replace(`${pathname}?${params.toString()}`)
    setSelectedIds([])
  }, [router, pathname, searchParams])

  const handleSelectChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    )
  }, [])

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? currentOrders.map((o) => o.id) : [])
  }, [currentOrders])

  const handleExport = useCallback(async () => {
    if (selectedIds.length === 0 || isExporting) return
    setIsExporting(true)

    try {
      const res = await fetch('/api/orders/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '导出失败')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('content-disposition')
      const match = disposition?.match(/filename="(.+)"/)
      a.download = match ? match[1] : '已完成订单导出.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || '导出失败，请稍后重试')
    } finally {
      setIsExporting(false)
    }
  }, [selectedIds, isExporting])

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

      <OrderExportToolbar
        selectedCount={selectedIds.length}
        totalCount={currentOrders.length}
        allSelected={currentOrders.length > 0 && selectedIds.length === currentOrders.length}
        onSelectAll={handleSelectAll}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <div className="mt-2">
        {currentTab === 'completed' ? (
          <CompletedOrderList orders={completedOrders} userRole={userRole} status="completed" selectedIds={selectedIds} onSelectChange={handleSelectChange} />
        ) : (
          <CompletedOrderList orders={cancelledOrders} userRole={userRole} status="cancelled" selectedIds={selectedIds} onSelectChange={handleSelectChange} />
        )}
      </div>
    </>
  )
}
