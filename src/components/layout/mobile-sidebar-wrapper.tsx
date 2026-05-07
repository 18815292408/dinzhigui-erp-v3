'use client'

import { useState } from 'react'
import { MobileSidebar } from './sidebar'

export function MobileSidebarWrapper({ 
  userRole, 
  userEmail, 
  canManageUsers 
}: { 
  userRole: string; 
  userEmail: string; 
  canManageUsers?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false)

  // 使用自定义事件来打开菜单
  if (typeof window !== 'undefined') {
    window.openMobileMenu = () => setIsOpen(true)
  }

  return (
    <MobileSidebar 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
      userRole={userRole} 
      userEmail={userEmail} 
      canManageUsers={canManageUsers} 
    />
  )
}
