'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function Header({ userName, userRole }: { userName: string; userRole: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    // Call logout API
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white/60 backdrop-blur-2xl border-b border-apple-gray-200/30 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left side - Page title area */}
      <div className="flex items-center gap-3">
        <div className="bg-apple-gray-100 rounded-full px-4 py-1.5">
          <span className="text-[13px] font-medium text-apple-gray-500">全屋定制门店管理</span>
        </div>
      </div>

      {/* Right side - User actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell with real functionality */}
        <NotificationBell userRole={userRole} />

        {/* User avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>

        {/* User name */}
        <div className="px-3">
          <span className="text-[14px] font-medium text-apple-gray-900">{userName}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-full hover:bg-apple-gray-100 active:bg-apple-gray-200 flex items-center justify-center transition-all duration-200 group"
          title="退出登录"
        >
          <LogOut className="w-5 h-5 text-apple-gray-700 group-hover:text-apple-red transition-colors" />
        </button>
      </div>
    </header>
  )
}
