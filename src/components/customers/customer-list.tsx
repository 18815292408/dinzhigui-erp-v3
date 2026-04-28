'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
    <div className="space-y-4">
      {deleteError && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{deleteError}</div>
      )}
      {customers.map((customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`}>
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {customer.phone} · {customer.house_type || '未填写房型'}
                  {customer.orders?.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      （{customer.orders.length}个已完成订单）
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteCustomer(customer.id, e)}
                disabled={deleteId === customer.id}
                className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >
                {deleteId === customer.id ? '删除中...' : '删除'}
              </button>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
