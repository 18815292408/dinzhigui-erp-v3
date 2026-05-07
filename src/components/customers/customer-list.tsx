'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Phone, Home, Trash2 } from 'lucide-react'

export function CustomerList({ customers }: { customers: any[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteCustomer = async (customerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('确定要删除该客户吗？删除后无法恢复。')) return

    setDeleteId(customerId)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error || '删除失败')
        setDeleteId(null)
        return
      }
      router.refresh()
    } catch {
      setDeleteError('删除失败')
      setDeleteId(null)
    }
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无客户数据
      </div>
    )
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      {deleteError && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{deleteError}</div>
      )}
      {customers.map((customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`}>
          <Card className="p-3 lg:p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm lg:text-base truncate">{customer.name}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs lg:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    {customer.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Home className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    {customer.house_type || '未填写房型'}
                  </span>
                  {customer.orders?.length > 0 && (
                    <span className="text-xs text-gray-400">
                      （{customer.orders.length}个已完成订单）
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteCustomer(customer.id, e)}
                disabled={deleteId === customer.id}
                className="shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                aria-label="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
