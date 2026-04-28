'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  summary: string
  priority: string
  is_read: boolean
  order?: { id: string; customer_name: string; order_no: string }
}

interface NotificationBellProps {
  userRole: string
}

export function NotificationBell({ userRole }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [urgentNotifications, setUrgentNotifications] = useState<Notification[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (mounted && urgentNotifications.length > 0) {
      // 店长/经理不弹窗，只看通知列表
      if (['owner', 'manager'].includes(userRole)) {
        return
      }
      // 使用 localStorage + sessionId 来判断是否需要显示弹窗
      // sessionId 在登录时生成，存储在 localStorage 中
      // 每次登录后会生成新的 sessionId，所以重新登录会重置弹窗状态
      const currentSessionId = localStorage.getItem('session_id')
      const shownSessionId = localStorage.getItem('notification_modal_shown_for_session')

      if (currentSessionId && shownSessionId !== currentSessionId) {
        setShowModal(true)
        localStorage.setItem('notification_modal_shown_for_session', currentSessionId)
      }
    }
  }, [mounted, urgentNotifications, userRole])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const urgent = data.filter((n: Notification) => n.priority === 'urgent' && !n.is_read)
        setUrgentNotifications(urgent)
        setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  const handleAcknowledge = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      credentials: 'include'
    })
    setUrgentNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
    if (urgentNotifications.length <= 1) {
      setShowModal(false)
    }
    fetchNotifications()
  }

  if (!mounted) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-white">!</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-600">紧急事项</h2>
                  <p className="text-sm text-gray-500">您有事项需要处理，请前往消息中心处理</p>
                </div>
              </div>

              {urgentNotifications.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {urgentNotifications.map(n => (
                    <div key={n.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-gray-500">{n.summary}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无紧急事项
                </p>
              )}
            </div>

            <div className="flex gap-3 p-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 px-4 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
              >
                关闭
              </button>
              {urgentNotifications.length > 0 && (
                <button
                  onClick={() => urgentNotifications.forEach(n => handleAcknowledge(n.id))}
                  className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                >
                  全部标记已读
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
