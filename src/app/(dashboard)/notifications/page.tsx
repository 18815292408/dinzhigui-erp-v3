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
  Wrench,
  X
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
    status: string
  }
}

function AcceptModal({ notification, onClose, onAccepted, setSuccessMessage, setErrorMessage }: {
  notification: Notification
  onClose: () => void
  onAccepted: () => void
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
}) {
  const [designDays, setDesignDays] = useState(7)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/notifications/${notification.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_due_days: designDays })
      })
      if (response.ok) {
        onAccepted()
        onClose()
        // 使用自定义提示替代 alert，避免阻塞 UI 更新
        setSuccessMessage('接单成功！请前往方案管理查看。')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const data = await response.json()
        setErrorMessage(data.error || '接单失败')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error accepting order:', error)
      setErrorMessage('接单失败')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + designDays)
  const dueDateStr = dueDate.toLocaleDateString('zh-CN')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-4">接单确认</h3>

        {notification.order && (
          <p className="text-sm text-muted-foreground mb-4">
            订单 {notification.order.order_no} · {notification.order.customer_name}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">预计完成天数</label>
          <div className="flex gap-2 flex-wrap">
            {[3, 5, 7, 10, 14, 21].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setDesignDays(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  designDays === days
                    ? 'bg-apple-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days}天
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            预计完成日期：{dueDateStr}
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading ? '接单中...' : '确认接单'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending_orders'>('all')
  const [loading, setLoading] = useState(true)
  const [acceptingNotification, setAcceptingNotification] = useState<Notification | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const handleAccept = async () => {
    const acceptedId = acceptingNotification?.id
    // Clear the accepting notification to close modal
    setAcceptingNotification(null)
    // Optimistically remove the accepted notification from the list
    if (acceptedId) {
      setNotifications(prev => prev.filter(n => n.id !== acceptedId))
    }
  }

  const markAllAsRead = async () => {
    try {
      // Only mark non-order notifications as read (order notifications need user to accept/reject)
      const orderTypes = ['new_order', 'order_dispatch', 'pending_order']
      await Promise.all(
        notifications
          .filter(n => !n.is_read && !orderTypes.includes(n.type))
          .map(n => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
      )
      // Update local state only for non-order notifications
      setNotifications(prev => prev.map(n =>
        orderTypes.includes(n.type) ? n : { ...n, is_read: true }
      ))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'pending_orders') {
      const orderTypes = ['new_order', 'order_dispatch', 'pending_order']
      return orderTypes.includes(n.type) && n.order && !n.is_read
    }
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const pendingOrdersCount = notifications.filter(n => {
    const orderTypes = ['new_order', 'order_dispatch', 'pending_order']
    return orderTypes.includes(n.type) && n.order && !n.is_read
  }).length

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
    <>
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

        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread' | 'pending_orders')}>
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
            <TabsTrigger value="pending_orders">
              待接单
              {pendingOrdersCount > 0 && (
                <Badge variant="default" className="ml-2 h-5 min-w-[1.25rem] justify-center bg-green-500">
                  {pendingOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? '暂无未读消息' :
                 filter === 'pending_orders' ? '暂无待接单订单' : '暂无消息'}
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

                        <div className="flex gap-2">
                          {notification.order && (['new_order', 'order_dispatch', 'pending_order'].includes(notification.type)) && (
                            notification.order.status !== 'pending_design' ? (
                              <span className="text-sm text-gray-500 font-medium">已接单</span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setAcceptingNotification(notification)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                接单
                              </Button>
                            )
                          )}
                          {!notification.is_read && !['new_order', 'order_dispatch', 'pending_order'].includes(notification.type) && (
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
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {acceptingNotification && (
        <AcceptModal
          notification={acceptingNotification}
          onClose={() => setAcceptingNotification(null)}
          onAccepted={handleAccept}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
        />
      )}
    </>
  )
}
