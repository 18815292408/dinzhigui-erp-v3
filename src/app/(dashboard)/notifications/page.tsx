'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  AlertCircle,
  Clock,
  CheckCircle,
  Archive,
  FileText,
  Truck,
  DollarSign,
  Users,
  Palette,
  Wrench
} from 'lucide-react'

const PRIORITY_CONFIG = {
  urgent: {
    label: '紧急',
    color: '#ff3b30',
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: AlertCircle
  },
  important: {
    label: '重要',
    color: '#ff9500',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    icon: Clock
  },
  normal: {
    label: '一般',
    color: '#0071e3',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: FileText
  },
  info: {
    label: '信息',
    color: '#5856d6',
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    icon: CheckCircle
  }
}

const NOTIFICATION_TYPE_ICONS: Record<string, any> = {
  'new_order': Bell,
  'drawing_reminder': Palette,
  'drawing_timeout': AlertCircle,
  'payment_reminder': DollarSign,
  'payment_overdue': AlertCircle,
  'shipment_reminder': Truck,
  'installation_delay': Wrench,
  'supplement_request': FileText,
  'design_confirmed': CheckCircle,
  'installation_completed': CheckCircle,
  'order_archived': Archive,
  'order_dispatch': Truck,
  'pending_order': Bell,
  'pending_review': Users,
}

interface Notification {
  id: string
  title: string
  summary: string
  priority: 'urgent' | 'important' | 'normal' | 'info'
  type: string
  is_read: boolean
  created_at: string
  order?: {
    id: string
    order_no: string
    customer_name: string
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data || [])
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST'
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.is_read)
          .map(n => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
      )
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">通知中心</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">通知中心</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-6 min-w-[2rem] justify-center">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            全部标为已读
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="unread">
            未读
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[1.25rem] justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'unread' ? '暂无未读消息' : '暂无消息'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map(notification => {
            const config = PRIORITY_CONFIG[notification.priority] || PRIORITY_CONFIG.info
            const TypeIcon = NOTIFICATION_TYPE_ICONS[notification.type] || Bell

            return (
              <Card
                key={notification.id}
                className={`p-4 border-l-4 ${config.border} ${config.bg} ${
                  notification.is_read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: config.color }}
                  >
                    <TypeIcon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.label}
                      </Badge>
                      <span className="font-medium truncate">{notification.title}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.summary}
                    </p>

                    {notification.order && (
                      <p className="text-xs text-muted-foreground mb-2">
                        订单: {notification.order.order_no} · {notification.order.customer_name}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </span>

                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          标为已读
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
