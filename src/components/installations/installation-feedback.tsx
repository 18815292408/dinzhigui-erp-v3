'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const statusMap: Record<string, string> = {
  pending: '待安装',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

export function InstallationFeedback({ installationId, currentStatus }: { installationId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()

  // 提交后显示完成状态
  if (isSubmitted) {
    return (
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="font-medium text-green-700">
          {status === 'completed' ? '✓ 安装已完成' : '✗ 已取消'}
        </p>
        {feedback && <p className="text-sm text-green-600 mt-1">{feedback}</p>}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const updates: any = { status }
      if (feedback) updates.feedback = feedback
      if (status === 'completed') updates.completed_at = new Date().toISOString()

      const res = await fetch(`/api/installations/${installationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新失败')
      }

      setSuccess(true)
      setIsSubmitted(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-600">状态更新成功</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">更新状态</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full h-9 px-3 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          style={{ lineHeight: '2.25rem' }}
        >
          <option value="pending">待安装</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">安装反馈</label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="记录安装情况、问题等..."
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交反馈'}
      </Button>
    </form>
  )
}
