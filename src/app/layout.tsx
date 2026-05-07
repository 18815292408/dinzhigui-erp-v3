import type { Metadata, Viewport } from 'next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: '定制大师 - 全屋定制门店管理系统',
  description: '全屋定制门店ERP管理系统',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
