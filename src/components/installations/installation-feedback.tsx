'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PerFactoryShipmentCard } from '@/components/installations/per-factory-shipment-card'
import { getFactoryShipmentViewState } from '@/lib/factory-shipment'

interface InstallationFeedbackProps {
  installationId: string
  orderId: string
  installationStatus: string
  estimatedShipmentDate: string | null
  factoryRecords?: unknown
  canEdit: boolean
  feedbackRecords?: unknown
}

interface FeedbackEntry {
  content: string
  date: string
}

function normalizeFeedbackRecords(value: unknown): FeedbackEntry[] {
  if (Array.isArray(value)) return value as FeedbackEntry[]
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function InstallationFeedback({
  installationId,
  orderId,
  installationStatus,
  factoryRecords,
  canEdit,
  feedbackRecords,
}: InstallationFeedbackProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const records = normalizeFeedbackRecords(feedbackRecords)
  const factoryViewState = getFactoryShipmentViewState('installation', installationStatus, factoryRecords)
  const isInstallStage = ['arrived', 'delivering', 'installing', 'supplement_pending'].includes(installationStatus)
  const isInstalled = installationStatus === 'installed'

  if (!canEdit) return <p className="text-sm text-muted-foreground">无编辑权限</p>

  return (
    <div className="space-y-5">
      {/* 工厂出货记录卡片 */}
      {factoryViewState.showFactoryCard && (
        <PerFactoryShipmentCard
          orderId={orderId}
          factoryRecords={factoryRecords}
          canEdit={canEdit}
          showActions={factoryViewState.canManageFactoryTiming}
          onChange={() => router.refresh()}
        />
      )}

      {/* 安装阶段：反馈记录 + 添加反馈表单 + 完成安装 */}
      {isInstallStage && (
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
      )}

      {/* 出货阶段/已完成：只展示已有反馈记录 */}
      {!isInstallStage && records.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">安装反馈记录</h4>
          {records.map((record, index) => (
            <div key={`${record.date}-${index}`} className="rounded-lg border p-4">
              <p className="text-sm">{record.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(record.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 已完成横幅 */}
      {isInstalled && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="font-medium text-green-700">安装已完成</p>
        </div>
      )}
    </div>
  )
}

function InstallStep({
  installationId,
  orderId,
  records,
  feedback,
  setFeedback,
  loading,
  setLoading,
  setError,
  error,
  router,
}: {
  installationId: string
  orderId: string
  records: FeedbackEntry[]
  feedback: string
  setFeedback: (value: string) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string) => void
  error: string
  router: ReturnType<typeof useRouter>
}) {
  const [submitted, setSubmitted] = useState(false)
  const [addingFeedback, setAddingFeedback] = useState(false)

  const handleAddFeedback = async () => {
    if (!feedback.trim()) {
      setError('请填写反馈内容')
      return
    }

    setAddingFeedback(true)
    setError('')
    try {
      const res = await fetch(`/api/installations/${installationId}`, { credentials: 'include' })
      const { data: installation } = await res.json()
      const existingRecords = normalizeFeedbackRecords(installation?.feedback)
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

      if (!res2.ok) {
        const responseError = await res2.json()
        throw new Error(responseError.error || '添加反馈失败')
      }

      setFeedback('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '添加反馈失败')
    } finally {
      setAddingFeedback(false)
    }
  }

  const handleComplete = async () => {
    if (records.length === 0) {
      setError('请先添加至少一条安装反馈')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res1 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed', feedback: records }),
      })
      if (!res1.ok) {
        const responseError = await res1.json()
        throw new Error(responseError.error || '提交失败')
      }

      const res2 = await fetch(`/api/orders/${orderId}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: 'installed' }),
      })
      if (!res2.ok) {
        const responseError = await res2.json()
        throw new Error(responseError.error || '更新安装状态失败')
      }

      const res3 = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res3.ok) {
        const responseError = await res3.json()
        throw new Error(responseError.error || '完成订单失败')
      }

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
      <div className="rounded-lg bg-green-50 p-4">
        <p className="font-medium text-green-700">安装已完成</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">货物已到齐，可以开始记录安装反馈。</p>

      {records.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">安装反馈记录</h4>
          {records.map((record, index) => (
            <div key={`${record.date}-${index}`} className="rounded-lg border p-4">
              <p className="text-sm">{record.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(record.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium">添加安装反馈</label>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="记录安装情况、问题等..."
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
        />
        <button
          type="button"
          onClick={handleAddFeedback}
          disabled={addingFeedback || !feedback.trim()}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {addingFeedback ? '添加中...' : '添加反馈'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border-t pt-2">
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading || records.length === 0}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '提交中...' : '确认完成安装'}
        </button>
      </div>
    </div>
  )
}
