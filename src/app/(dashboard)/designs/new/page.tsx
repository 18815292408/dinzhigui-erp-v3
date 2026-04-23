import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseSessionUser } from '@/lib/types'

// 设计师访问 /designs/new 时重定向到 /designs/assigned
// 设计师必须从分配给我的订单中选择来创建设计
export default async function NewDesignPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (sessionCookie) {
    const user = parseSessionUser(sessionCookie.value)
    if (user?.role === 'designer') {
      redirect('/designs/assigned')
    }
  }

  // 非设计师用户显示提示
  return (
    <div className="p-6">
      <p className="text-muted-foreground">请从方案列表选择订单来创建设计方案</p>
    </div>
  )
}