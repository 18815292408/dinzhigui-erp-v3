'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SetShipmentDateFormProps {
  orderId: string
  estimatedShipmentDate: string | null
  isAssignedInstaller: boolean
  installationId: string
  installationStatus?: string
}

export function SetShipmentDateForm({
  orderId,
  estimatedShipmentDate,
  isAssignedInstaller,
  installationId,
  installationStatus,
}: SetShipmentDateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState(estimatedShipmentDate || '')

  if (!isAssignedInstaller) return null

  // 确认出货时间（仅更新日期，不改变状态）
  const handleConfirmDate = async () => {
    if (!date) {
      setError('请选择出货日期')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/set-shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estimated_shipment_date: date }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '设置出货日期失败')
        return
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '设置出货日期失败')
    } finally {
      setLoading(false)
    }
  }

  // 确认已到货（同时把安装单推进到"进行中"，需要填写预约日期）
  const handleConfirmArrived = async () => {
    if (!date) {
      setError('请先选择预计出货日期')
      return
    }
    setLoading(true)
    setError('')
    try {
      // 更新订单侧：installation_status → arrived
      const res1 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'arrived' }),
      })
      if (!res1.ok) {
        const err = await res1.json()
        throw new Error(err.error || '确认到货失败')
      }
      // 更新安装单侧：status → in_progress，同时设置预约日期
      const res2 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'in_progress',
          scheduled_date: date,
        }),
      })
      if (!res2.ok) {
        const err = await res2.json()
        throw new Error(err.error || '更新安装单状态失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">预计出货/到货日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleConfirmDate}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {loading ? '处理中...' : '确认出货时间'}
        </button>
        {(installationStatus === 'pending_ship' || installationStatus === 'shipped') && (
          <button
            onClick={handleConfirmArrived}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
          >
            {loading ? '处理中...' : '确认已到货'}
          </button>
        )}
      </div>
    </div>
  )
}
