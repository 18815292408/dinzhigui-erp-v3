'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InstallationFeedbackProps {
  installationId: string
  orderId: string
  installationStatus: string // orders.installation_status: pending_ship / shipped / arrived / delivering / installing / supplement_pending / installed
  estimatedShipmentDate: string | null
  canEdit: boolean
}

export function InstallationFeedback({
  installationId,
  orderId,
  installationStatus,
  estimatedShipmentDate,
  canEdit,
}: InstallationFeedbackProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  if (!canEdit) return <p className="text-sm text-muted-foreground">无编辑权限</p>

  // ===== 步骤一：填写出货日期（pending_ship / shipped） =====
  if (['pending_ship', 'shipped'].includes(installationStatus)) {
    return (
      <ShipmentStep
        orderId={orderId}
        installationId={installationId}
        estimatedShipmentDate={estimatedShipmentDate}
        installationStatus={installationStatus}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
        error={error}
        router={router}
      />
    )
  }

  // ===== 步骤二：确认到货后，进入安装阶段（arrived / delivering / installing / supplement_pending） =====
  if (['arrived', 'delivering', 'installing', 'supplement_pending'].includes(installationStatus)) {
    return (
      <InstallStep
        installationId={installationId}
        orderId={orderId}
        feedback={feedback}
        setFeedback={setFeedback}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
        error={error}
        router={router}
      />
    )
  }

  // ===== 已完成 =====
  return (
    <div className="p-4 bg-green-50 rounded-lg">
      <p className="font-medium text-green-700">✓ 安装已完成</p>
    </div>
  )
}

// 步骤一：填写出货日期
function ShipmentStep({ orderId, installationId, estimatedShipmentDate, installationStatus, loading, setLoading, setError, error, router }: any) {
  const [date, setDate] = useState(estimatedShipmentDate || '')

  const handleConfirmDate = async () => {
    if (!date) { setError('请选择出货日期'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/set-shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estimated_shipment_date: date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '设置出货日期失败')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '设置出货日期失败')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmArrived = async () => {
    setLoading(true); setError('')
    try {
      // 更新订单侧：installation_status → arrived
      const res1 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'arrived' }),
      })
      if (!res1.ok) { const e = await res1.json(); throw new Error(e.error || '确认到货失败') }
      // 更新安装单侧：status → in_progress
      const res2 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!res2.ok) { const e = await res2.json(); throw new Error(e.error || '更新安装单状态失败') }
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
        <label className="text-sm font-medium block mb-1">预计出货日期</label>
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
        {['pending_ship', 'shipped'].includes(installationStatus) && (
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

// 步骤二：安装阶段
function InstallStep({ installationId, orderId, feedback, setFeedback, loading, setLoading, setError, error, router }: any) {
  const [submitted, setSubmitted] = useState(false)

  const handleComplete = async () => {
    if (!feedback.trim()) { setError('请填写安装反馈'); return }
    setLoading(true); setError('')
    try {
      // 1. 完成安装单
      const res1 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed', feedback }),
      })
      if (!res1.ok) { const e = await res1.json(); throw new Error(e.error || '提交失败') }
      // 2. 更新订单安装状态为已安装
      const res2 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'installed' }),
      })
      if (!res2.ok) { const e = await res2.json(); throw new Error(e.error || '更新安装状态失败') }
      // 3. 将订单状态设为已完成
      const res3 = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res3.ok) { const e = await res3.json(); throw new Error(e.error || '完成订单失败') }
      setSubmitted(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="font-medium text-green-700">✓ 安装已完成</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">货物已到，开始安装。安装完成后填写反馈并提交。</p>
      <div>
        <label className="text-sm font-medium block mb-1">安装反馈</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="记录安装情况、问题等..."
          className="w-full px-3 py-2 border rounded-lg text-sm"
          rows={3}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleComplete}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
      >
        {loading ? '提交中...' : '确认完成安装'}
      </button>
    </div>
  )
}
