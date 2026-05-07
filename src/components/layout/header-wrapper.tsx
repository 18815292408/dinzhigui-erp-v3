'use client'

import { Header } from './header'

export function HeaderWrapper({ 
  userName, 
  userRole 
}: { 
  userName: string; 
  userRole: string;
}) {
  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.openMobileMenu) {
      window.openMobileMenu()
    }
  }

  return (
    <Header 
      userName={userName} 
      userRole={userRole} 
      onMenuClick={handleMenuClick} 
    />
  )
}
