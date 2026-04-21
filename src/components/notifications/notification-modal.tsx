'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NotificationModalProps {
  onClose: () => void
}

export function NotificationModal({ onClose }: NotificationModalProps) {
  const [urgentNotifications, setUrgentNotifications] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUrgent = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .eq('priority', 'urgent')
        .order('created_at', { ascending: false })
        .limit(5)
      setUrgentNotifications(data || [])
    }
    fetchUrgent()
  }, [])

  const handleGoToCenter = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('priority', 'urgent')
      .eq('is_read', false)
    onClose()
    router.push('/notifications')
  }

  const handleAcknowledge = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    setUrgentNotifications(prev => prev.filter(n => n.id !== id))
    if (urgentNotifications.length <= 1) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-600">紧急事项</h2>
              <p className="text-sm text-gray-500">您有事项需要处理，请立即前往消息中心</p>
            </div>
          </div>

          {urgentNotifications.length > 0 && (
            <div className="space-y-2 mb-4">
              {urgentNotifications.map(n => (
                <div key={n.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-gray-500">{n.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
          >
            知道了
          </button>
          <button
            onClick={handleGoToCenter}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
          >
            立即前往
          </button>
        </div>
      </div>
    </div>
  )
}
