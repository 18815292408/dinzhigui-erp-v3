'use client'

import { useState } from 'react'

interface OrderAmountEditorProps {
  orderId: string
  signedAmount: number | null
  finalOrderAmount: number | null
}

export function OrderAmountEditor({ orderId, signedAmount, finalOrderAmount }: OrderAmountEditorProps) {
  const [editing, setEditing] = useState(false)
  const [signedInput, setSignedInput] = useState(signedAmount?.toString() || '')
  const [finalInput, setFinalInput] = useState(finalOrderAmount?.toString() || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signed_amount: signedInput ? parseFloat(signedInput) : null,
          final_order_amount: finalInput ? parseFloat(finalInput) : null
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      setEditing(false)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap">签单金额：</label>
          <input
            type="number"
            value={signedInput}
            onChange={(e) => setSignedInput(e.target.value)}
            className="w-24 px-2 py-1 border rounded"
            placeholder="万元"
          />
          <span className="text-sm">万</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm whitespace-nowrap">最终下单销售额：</label>
          <input
            type="number"
            value={finalInput}
            onChange={(e) => setFinalInput(e.target.value)}
            className="w-24 px-2 py-1 border rounded"
            placeholder="万元"
          />
          <span className="text-sm">万</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            保存
          </button>
          <button
            onClick={() => {
              setSignedInput(signedAmount?.toString() || '')
              setFinalInput(finalOrderAmount?.toString() || '')
              setEditing(false)
            }}
            className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">签单金额：</span>
          <span className={signedAmount ? 'text-green-600 font-medium' : 'text-gray-400'}>
            {signedAmount ? `¥${signedAmount}万` : '未填写'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">最终下单销售额：</span>
          <span className={finalOrderAmount ? 'text-green-600 font-medium' : 'text-gray-400'}>
            {finalOrderAmount ? `¥${finalOrderAmount}万` : '未填写'}
          </span>
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-blue-500 text-sm hover:underline ml-4"
      >
        修改
      </button>
    </div>
  )
}
