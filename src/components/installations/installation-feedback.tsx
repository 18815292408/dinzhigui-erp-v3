'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InstallationFeedbackProps {
  installationId: string
  orderId: string
  installationStatus: string
  estimatedShipmentDate: string | null
  canEdit: boolean
  /** 现有的反馈记录（JSONB 数组） */
  feedbackRecords?: Array<{ content: string; date: string }>
}

interface FeedbackEntry {
  content: string
  date: string
}

export function InstallationFeedback({
  installationId,
  orderId,
  installationStatus,
  estimatedShipmentDate,
  canEdit,
  feedbackRecords,
}: InstallationFeedbackProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const records: FeedbackEntry[] = Array.isArray(feedbackRecords) ? feedbackRecords : []

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

  // ===== 步骤二：安装阶段（arrived / delivering / installing / supplement_pending） =====
  if (['arrived', 'delivering', 'installing', 'supplement_pending'].includes(installationStatus)) {
    return (
      <InstallStep
        installationId={installationId}
        orderId={orderId}
        records={records}
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
    <div className="space-y-4">
      {records.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">安装反馈记录</h4>
          {records.map((r, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <p className="text-sm">{r.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(r.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="font-medium text-green-700">✓ 安装已完成</p>
      </div>
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
      const res1 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'arrived' }),
      })
      if (!res1.ok) { const e = await res1.json(); throw new Error(e.error || '确认到货失败') }
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

// 步骤二：安装阶段（可逐天添加多条反馈）
function InstallStep({ installationId, orderId, records, feedback, setFeedback, loading, setLoading, setError, error, router }: any) {
  const [submitted, setSubmitted] = useState(false)
  const [addingFeedback, setAddingFeedback] = useState(false)

  const handleAddFeedback = async () => {
    if (!feedback.trim()) { setError('请填写反馈内容'); return }
    setAddingFeedback(true); setError('')
    try {
      // 获取当前安装单数据
      const res = await fetch(`/api/installations/${installationId}`, { credentials: 'include' })
      const { data: installation } = await res.json()

      const existingRecords: FeedbackEntry[] = Array.isArray(installation?.feedback) ? installation.feedback : []
      const newEntry: FeedbackEntry = {
        content: feedback.trim(),
        date: new Date().toISOString(),
      }

      const res2 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedback: [...existingRecords, newEntry] }),
      })
      if (!res2.ok) { const e = await res2.json(); throw new Error(e.error || '添加反馈失败') }

      setFeedback('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '添加反馈失败')
    } finally {
      setAddingFeedback(false)
    }
  }

  const handleComplete = async () => {
    if (records.length === 0) { setError('请先添加至少一条安装反馈'); return }
    setLoading(true); setError('')
    try {
      const res1 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed', feedback: records }),
      })
      if (!res1.ok) { const e = await res1.json(); throw new Error(e.error || '提交失败') }
      const res2 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'installed' }),
      })
      if (!res2.ok) { const e = await res2.json(); throw new Error(e.error || '更新安装状态失败') }
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
    <div className="space-y-4">
      <p className="text-sm text-gray-600">货物已到，开始安装。可逐天添加安装反馈。</p>

      {/* 已有反馈记录列表 */}
      {records.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">安装反馈记录</h4>
          {records.map((r: FeedbackEntry, i: number) => (
            <div key={i} className="p-4 border rounded-lg">
              <p className="text-sm">{r.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(r.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 添加新反馈 */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">添加安装反馈</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="记录安装情况、问题等..."
          className="w-full px-3 py-2 border rounded-lg text-sm"
          rows={3}
        />
        <button
          onClick={handleAddFeedback}
          disabled={addingFeedback || !feedback.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {addingFeedback ? '添加中...' : '添加反馈'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="pt-2 border-t">
        <button
          onClick={handleComplete}
          disabled={loading || records.length === 0}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          {loading ? '提交中...' : '确认完成安装'}
        </button>
      </div>
    </div>
  )
}
