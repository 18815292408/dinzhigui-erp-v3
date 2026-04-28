'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_EMAIL } from '@/lib/types'
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Settings,
  Shield,
  Bell,
  Factory,
  CheckCircle,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  section: 'top' | 'workflow' | 'settings'
}

const navigation: NavItem[] = [
  { name: '数据看板', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'top' },
  { name: '客户管理', href: '/customers', icon: Users, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'workflow' },
  { name: '方案管理', href: '/designs', icon: FileText, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'workflow' },
  { name: '安装管理', href: '/installations', icon: Wrench, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'workflow' },
  { name: '已完成订单', href: '/completed-orders', icon: CheckCircle, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'workflow' },
  { name: '工厂管理', href: '/factories', icon: Factory, roles: ['owner', 'manager'], section: 'settings' },
  { name: '消息中心', href: '/notifications', icon: Bell, roles: ['owner', 'manager', 'designer', 'sales', 'installer'], section: 'settings' },
  { name: '账号管理', href: '/settings/users', icon: Settings, roles: ['owner'], section: 'settings' },
  { name: '管理员面板', href: '/settings/admin', icon: Shield, roles: ['owner'], section: 'settings' },
]

export function Sidebar({ userRole, userEmail }: { userRole: string; userEmail: string }) {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 h-full w-[280px] bg-apple-gray-50/95 backdrop-blur-2xl border-r border-apple-gray-200/50 z-50">
      {/* Logo area */}
      <div className="px-6 py-5 border-b border-apple-gray-200/30">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="定制大师" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-apple-gray-900">定制大师</h1>
            <p className="text-[12px] text-apple-gray-500">ERP管理系统</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-5">
        {/* 数据看板 - 独立置顶 */}
        <div className="space-y-1">
          {navigation
            .filter((item) => item.section === 'top' && item.roles.includes(userRole))
            .map((item) => {
              const isActive = pathname === item.href
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

        {/* 业务流程 - 竖线串联 */}
        <div className="relative">
          <p className="px-4 mb-1 text-[11px] font-medium text-apple-gray-400 uppercase tracking-wider">
            业务流程
          </p>
          {/* 连续竖线：从第一个圆点到最后一个圆点 */}
          <div className="absolute left-[22px] top-[44px] bottom-[22px] w-px bg-apple-gray-200" />
          <div className="space-y-0">
            {navigation
              .filter((item) => item.section === 'workflow' && item.roles.includes(userRole))
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
                    {/* 圆点 */}
                    <div className="relative flex items-center justify-center w-[11px] z-10">
                      <div className={cn(
                        'w-[7px] h-[7px] rounded-full border-2',
                        isActive ? 'border-white bg-white' : 'border-apple-gray-300 bg-white'
                      )} />
                    </div>
                    <Icon className={cn('w-5 h-5', isActive ? '' : 'text-apple-gray-700')} />
                    {item.name}
                  </Link>
                )
              })}
          </div>
        </div>

        {/* 系统设置 - 间距分隔 */}
        <div className="pt-1 space-y-1">
          {navigation
            .filter((item) => item.section === 'settings' && item.roles.includes(userRole))
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
          <p className="text-[13px] font-medium text-apple-gray-900">当前用户：{userRole === 'owner' && userEmail === ADMIN_EMAIL ? '管理员' : userRole === 'owner' ? '老板' : userRole === 'manager' ? '店长' : userRole === 'designer' ? '设计师' : userRole === 'sales' ? '导购' : '安装人员'}</p>
        </div>
      </div>
    </div>
  )
}
