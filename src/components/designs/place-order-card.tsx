'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FactorySelector, FactoryRecord } from '@/components/orders/factory-selector'

interface PlaceOrderCardProps {
  orderId: string
  customerId: string
  initialValue: FactoryRecord[]
}

export function PlaceOrderCard({ orderId, customerId, initialValue }: PlaceOrderCardProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async (factoryRecords: FactoryRecord[]) => {
    if (factoryRecords.length === 0) {
      setError('请至少选择一个工厂')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/place-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ factory_records: factoryRecords }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '下单失败')
        return
      }
      router.push(`/customers/${customerId}`)
    } catch (err: any) {
      setError(err.message || '下单失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>下单至工厂</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          选择工厂并下单，确认后订单进入待打款阶段
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <FactorySelector
          value={initialValue}
          showConfirm
          onConfirm={handleConfirm}
          confirmText={submitting ? '下单中...' : '确认下单'}
        />
      </CardContent>
    </Card>
  )
}
