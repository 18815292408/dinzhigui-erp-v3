'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import { NotificationModal } from './notification-modal'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    fetchUnreadCount()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        if (payload.new.priority === 'urgent') {
          setShowModal(true)
        }
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUnreadCount = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('is_read', false)
    setUnreadCount(data?.length || 0)
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
        <NotificationModal onClose={() => setShowModal(false)} />,
        document.body
      )}
    </>
  )
}
