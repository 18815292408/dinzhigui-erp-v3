'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Settings,
  Home,
  Shield
} from 'lucide-react'

const navigation = [
  { name: '数据看板', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'designer', 'sales', 'installer'] },
  { name: '客户管理', href: '/customers', icon: Users, roles: ['owner', 'manager', 'designer', 'sales', 'installer'] },
  { name: '方案管理', href: '/designs', icon: FileText, roles: ['owner', 'manager', 'designer', 'sales', 'installer'] },
  { name: '安装管理', href: '/installations', icon: Wrench, roles: ['owner', 'manager', 'designer', 'sales', 'installer'] },
  { name: '已完成订单', href: '/completed-orders', icon: Wrench, roles: ['owner', 'manager', 'designer', 'sales', 'installer'] },
  { name: '账号管理', href: '/settings/users', icon: Settings, roles: ['owner', 'manager'] },
  { name: '管理员面板', href: '/settings/admin', icon: Shield, roles: ['owner'] },
]

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 h-full w-[280px] bg-apple-gray-50/95 backdrop-blur-2xl border-r border-apple-gray-200/50 z-50">
      {/* Logo area */}
      <div className="px-6 py-5 border-b border-apple-gray-200/30">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-apple-gray-900">定制大师</h1>
            <p className="text-[12px] text-apple-gray-500">ERP管理系统</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-1">
          {navigation
            .filter((item) => item.roles.includes(userRole))
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-apple-blue text-white shadow-lg shadow-apple-blue/30'
                      : 'text-apple-gray-900 hover:bg-apple-gray-100 active:bg-apple-gray-200'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? '' : 'text-apple-gray-700')} />
                  {item.name}
                </Link>
              )
            })}
        </div>
      </nav>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-apple-gray-200/30">
        <div className="bg-gradient-to-br from-apple-blue/10 to-apple-purple/10 rounded-xl p-4">
          <p className="text-[13px] font-medium text-apple-gray-900">当前用户：{userRole === 'owner' ? '管理员' : userRole === 'manager' ? '店长' : userRole === 'designer' ? '设计师' : userRole === 'sales' ? '导购' : '安装人员'}</p>
        </div>
      </div>
    </div>
  )
}
