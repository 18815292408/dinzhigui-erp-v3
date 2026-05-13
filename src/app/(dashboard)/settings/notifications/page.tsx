import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseSessionUser } from '@/lib/types'
import { ServerChanSettings } from '@/components/settings/serverchan-settings'

export default async function NotificationsSettingsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold">通知设置</h1>
        <p className="text-sm text-muted-foreground">配置微信消息推送</p>
      </div>

      <ServerChanSettings />

      <div className="rounded-lg border p-4 bg-amber-50 space-y-2">
        <h3 className="font-medium text-sm">推送说明</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>仅「紧急」级别的通知会推送到微信（如：出图超时、待打款超期、安装延误）</li>
          <li>普通提醒仍仅在系统内显示</li>
          <li>不填写 SendKey 则只接收站内通知，不影响系统正常使用</li>
        </ul>
      </div>
    </div>
  )
}
