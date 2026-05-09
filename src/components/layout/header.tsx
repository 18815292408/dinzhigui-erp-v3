'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User, Menu } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function Header({ 
  userName, 
  userRole, 
  onMenuClick 
}: { 
  userName: string; 
  userRole: string;
  onMenuClick?: () => void;
}) {
  const router = useRouter()

  const handleLogout = async () => {
    // Call logout API
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    // 清理 localStorage 中的会话数据
    localStorage.removeItem('session')
    localStorage.removeItem('session_id')
    localStorage.removeItem('user')
    localStorage.removeItem('organization')
    sessionStorage.clear()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 lg:h-16 bg-white/60 backdrop-blur-2xl border-b border-apple-gray-200/30 flex items-center justify-between px-3 lg:px-6 sticky top-0 z-10">
      {/* Left side - Page title area */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-full hover:bg-apple-gray-100 active:bg-apple-gray-200 flex items-center justify-center transition-colors"
          aria-label="打开菜单"
        >
          <Menu className="w-5 h-5 text-apple-gray-700" />
        </button>
        
        <div className="bg-apple-gray-100 rounded-full px-3 lg:px-4 py-1.5 hidden sm:block">
          <span className="text-[13px] font-medium text-apple-gray-500">全屋定制门店管理</span>
        </div>
      </div>

      {/* Right side - User actions */}
      <div className="flex items-center gap-1 lg:gap-2">
        {/* Notification bell with real functionality */}
        <NotificationBell userRole={userRole} />

        {/* User avatar */}
        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
          <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>

        {/* User name - hidden on small mobile */}
        <div className="px-2 lg:px-3 hidden sm:block">
          <span className="text-[13px] lg:text-[14px] font-medium text-apple-gray-900">{userName}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full hover:bg-apple-gray-100 active:bg-apple-gray-200 flex items-center justify-center transition-all duration-200 group"
          title="退出登录"
        >
          <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-apple-gray-700 group-hover:text-apple-red transition-colors" />
        </button>
      </div>
    </header>
  )
}
