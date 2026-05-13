'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface OrderExportButtonProps {
  orderId: string
  variant?: 'default' | 'outline'
}

export function OrderExportButton({ orderId, variant = 'outline' }: OrderExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)

    try {
      const res = await fetch('/api/orders/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId] }),
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
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-4 w-4" />
      )}
      导出订单
    </Button>
  )
}
