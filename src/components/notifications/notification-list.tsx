'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'border-red-500 bg-red-50' },
  important: { label: '重要', color: 'border-orange-500 bg-orange-50' },
  normal: { label: '一般', color: 'border-blue-500 bg-blue-50' },
  info: { label: '信息', color: 'border-purple-500 bg-purple-50' }
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, order:orders(id, customer_name, order_no)')
      .order('priority')
      .order('created_at', { ascending: false })
    setNotifications(data || [])
  }

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    fetchNotifications()
  }

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
    fetchNotifications()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">消息中心</h2>
        <button onClick={markAllAsRead} className="text-sm text-blue-500 hover:underline">
          全部标为已读
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map(notif => {
          const config = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.info
          return (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border-l-4 ${config.color} ${notif.is_read ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs text-white bg-${notif.priority === 'urgent' ? 'red-500' : notif.priority === 'important' ? 'orange-500' : 'blue-500'}`}>
                      {config.label}
                    </span>
                    <span className="font-medium">{notif.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{notif.summary}</p>
                  {notif.order && (
                    <p className="text-xs text-gray-400">
                      订单: {notif.order.order_no} · {notif.order.customer_name}
                    </p>
                  )}
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    标为已读
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(notif.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          )
        })}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 text-gray-500">暂无消息</div>
      )}
    </div>
  )
}
