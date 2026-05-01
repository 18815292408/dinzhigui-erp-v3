'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PerFactoryShipmentCard } from '@/components/installations/per-factory-shipment-card'
import { getFactoryShipmentViewState } from '@/lib/factory-shipment'

interface InstallationFeedbackProps {
  installationId: string
  orderId: string
  installationStatus: string
  orderStatus: string
  estimatedShipmentDate: string | null
  factoryRecords?: unknown
  canEdit: boolean
  feedbackRecords?: unknown
  afterSalesFeedbackRecords?: unknown
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
  orderStatus,
  factoryRecords,
  canEdit,
  feedbackRecords,
  afterSalesFeedbackRecords,
}: InstallationFeedbackProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const records = normalizeFeedbackRecords(feedbackRecords)
  const afterSalesRecords = normalizeFeedbackRecords(afterSalesFeedbackRecords)
  const factoryViewState = getFactoryShipmentViewState('installation', installationStatus, factoryRecords)
  const isInstallStage = ['arrived', 'delivering', 'installing', 'supplement_pending'].includes(installationStatus)
  const isInstalled = installationStatus === 'installed' && orderStatus === 'in_install'
  const isAfterSales = orderStatus === 'in_after_sales'

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

      {/* 安装完成阶段：两个按钮 */}
      {isInstalled && (
        <InstallCompleteActions
          orderId={orderId}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          router={router}
        />
      )}

      {/* 售后阶段 */}
      {isAfterSales && (
        <AfterSalesStep
          installationId={installationId}
          orderId={orderId}
          installRecords={records}
          afterSalesRecords={afterSalesRecords}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          error={error}
          router={router}
        />
      )}

      {/* 出货阶段/已完成（非售后）：只展示已有反馈记录 */}
      {!isInstallStage && !isAfterSales && records.length > 0 && (
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

      {/* 已完成横幅（非售后） */}
      {installationStatus === 'installed' && !isAfterSales && orderStatus === 'completed' && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="font-medium text-green-700">安装已完成</p>
        </div>
      )}
    </div>
  )
}

function InstallCompleteActions({
  orderId,
  loading,
  setLoading,
  setError,
  router,
}: {
  orderId: string
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const handleComplete = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const responseError = await res.json()
        throw new Error(responseError.error || '完成订单失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '完成订单失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEnterAfterSales = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/after-sales`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const responseError = await res.json()
        throw new Error(responseError.error || '进入售后流程失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '进入售后流程失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-green-50 p-4">
        <p className="font-medium text-green-700">安装已完成</p>
        <p className="text-sm text-green-600 mt-1">请选择下一步操作：</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '处理中...' : '确认完成订单'}
        </button>
        <button
          type="button"
          onClick={handleEnterAfterSales}
          disabled={loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '处理中...' : '进入售后流程'}
        </button>
      </div>
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

  const markAsInstalled = async () => {
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
  }

  const handleCompleteOrder = async () => {
    if (records.length === 0) {
      setError('请先添加至少一条安装反馈')
      return
    }

    setLoading(true)
    setError('')
    try {
      await markAsInstalled()
      const res3 = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res3.ok) {
        const responseError = await res3.json()
        throw new Error(responseError.error || '完成订单失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAndEnterAfterSales = async () => {
    if (records.length === 0) {
      setError('请先添加至少一条安装反馈')
      return
    }

    setLoading(true)
    setError('')
    try {
      await markAsInstalled()
      const res3 = await fetch(`/api/orders/${orderId}/after-sales`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res3.ok) {
        const responseError = await res3.json()
        throw new Error(responseError.error || '进入售后流程失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '提交失败')
    } finally {
      setLoading(false)
    }
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

      <div className="border-t pt-2 flex gap-3">
        <button
          type="button"
          onClick={handleCompleteOrder}
          disabled={loading || records.length === 0}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '处理中...' : '确认完成安装'}
        </button>
        <button
          type="button"
          onClick={handleCompleteAndEnterAfterSales}
          disabled={loading || records.length === 0}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '处理中...' : '进入售后'}
        </button>
      </div>
    </div>
  )
}

function AfterSalesStep({
  installationId,
  orderId,
  installRecords,
  afterSalesRecords,
  loading,
  setLoading,
  setError,
  error,
  router,
}: {
  installationId: string
  orderId: string
  installRecords: FeedbackEntry[]
  afterSalesRecords: FeedbackEntry[]
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string) => void
  error: string
  router: ReturnType<typeof useRouter>
}) {
  const [feedback, setFeedback] = useState('')
  const [addingFeedback, setAddingFeedback] = useState(false)

  const handleAddAfterSalesFeedback = async () => {
    if (!feedback.trim()) {
      setError('请填写售后反馈内容')
      return
    }

    setAddingFeedback(true)
    setError('')
    try {
      const res = await fetch(`/api/installations/${installationId}`, { credentials: 'include' })
      const { data: installation } = await res.json()
      const existingRecords = normalizeFeedbackRecords(installation?.after_sales_feedback)
      const newEntry: FeedbackEntry = {
        content: feedback.trim(),
        date: new Date().toISOString(),
      }

      const res2 = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ after_sales_feedback: [...existingRecords, newEntry] }),
      })

      if (!res2.ok) {
        const responseError = await res2.json()
        throw new Error(responseError.error || '添加售后反馈失败')
      }

      setFeedback('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '添加售后反馈失败')
    } finally {
      setAddingFeedback(false)
    }
  }

  const handleCompleteAfterSales = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const responseError = await res.json()
        throw new Error(responseError.error || '完成订单失败')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || '完成订单失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-purple-50 p-4">
        <p className="font-medium text-purple-700">售后中</p>
      </div>

      {/* 安装反馈记录（只读） */}
      {installRecords.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">安装反馈记录</h4>
          {installRecords.map((record, index) => (
            <div key={`install-${record.date}-${index}`} className="rounded-lg border p-4 bg-gray-50">
              <p className="text-sm">{record.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(record.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 售后反馈记录 */}
      {afterSalesRecords.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-purple-700">售后反馈记录</h4>
          {afterSalesRecords.map((record, index) => (
            <div key={`after-${record.date}-${index}`} className="rounded-lg border border-purple-100 p-4">
              <p className="text-sm">{record.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(record.date).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 添加售后反馈 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">添加售后反馈</label>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="记录售后情况、问题等..."
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
        />
        <button
          type="button"
          onClick={handleAddAfterSalesFeedback}
          disabled={addingFeedback || !feedback.trim()}
          className="rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {addingFeedback ? '添加中...' : '添加售后反馈'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border-t pt-2">
        <button
          type="button"
          onClick={handleCompleteAfterSales}
          disabled={loading}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '提交中...' : '售后完成'}
        </button>
      </div>
    </div>
  )
}
