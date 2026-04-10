'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  customerId: string
  customerName: string
  organizationId: string
}

export function TransferDesignButton({ customerId, customerName, organizationId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTransfer = async () => {
    if (!confirm(`确定要为客户"${customerName}"转交设计吗？`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
          organization_id: organizationId,
          title: `${customerName} - 设计方案`,
          status: 'draft',
        }),
      })

      if (res.ok) {
        router.push(`/designs?notice=design_created&customer=${encodeURIComponent(customerName)}`)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to transfer:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleTransfer} disabled={loading}>
      {loading ? '转交中...' : '转交设计'}
    </Button>
  )
}
