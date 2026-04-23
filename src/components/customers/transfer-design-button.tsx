'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Designer {
  id: string
  name: string
}

interface Props {
  customerId: string
  customerName: string
  organizationId: string
}

export function TransferDesignButton({ customerId, customerName, organizationId }: Props) {
  const [loading, setLoading] = useState(false)
  const [showDesignerDialog, setShowDesignerDialog] = useState(false)
  const [designers, setDesigners] = useState<Designer[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null)
  const [signedAmount, setSignedAmount] = useState<string>('')
  const router = useRouter()

  const handleOpenDesignerDialog = async () => {
    // Fetch designers via API (bypasses RLS)
    const res = await fetch(`/api/designers?organization_id=${encodeURIComponent(organizationId)}`)

    if (!res.ok) {
      const err = await res.json()
      console.error('获取设计师失败:', err)
      setDesigners([])
    } else {
      const data = await res.json()
      setDesigners(data)
    }

    setShowDesignerDialog(true)
  }

  const handleTransfer = async () => {
    if (!selectedDesigner) {
      alert('请选择设计师')
      return
    }

    if (!signedAmount || parseFloat(signedAmount) <= 0) {
      alert('请填写签单金额')
      return
    }

    setLoading(true)
    try {
      // 1. Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_name: customerName,
          customer_id: customerId,
          signed_amount: parseFloat(signedAmount),
        }),
      })

      if (!orderRes.ok) {
        const err = await orderRes.json()
        alert('创建订单失败: ' + err.error)
        setLoading(false)
        return
      }

      const order = await orderRes.json()

      // 2. Dispatch to designer
      const dispatchRes = await fetch(`/api/orders/${order.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          designer_id: selectedDesigner,
        }),
      })

      if (!dispatchRes.ok) {
        const err = await dispatchRes.json()
        alert('派单失败: ' + err.error)
        setLoading(false)
        return
      }

      setShowDesignerDialog(false)
      // 转交成功，回到客户列表页面
      router.push('/customers')
      router.refresh()
    } catch (err) {
      console.error('Failed to transfer:', err)
      alert('转交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleOpenDesignerDialog}>
        转交设计
      </Button>

      <Dialog open={showDesignerDialog} onOpenChange={setShowDesignerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择设计师</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              为客户 "{customerName}" 选择设计师
            </p>
            <div className="grid grid-cols-2 gap-2">
              {designers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDesigner(d.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedDesigner === d.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {designers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无可用设计师
              </p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">签单金额（万）</label>
              <input
                type="number"
                value={signedAmount}
                onChange={(e) => setSignedAmount(e.target.value)}
                placeholder="请输入签单金额"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDesignerDialog(false)}>
                取消
              </Button>
              <Button onClick={handleTransfer} disabled={!selectedDesigner || !signedAmount || loading}>
                {loading ? '转交中...' : '确认转交'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
