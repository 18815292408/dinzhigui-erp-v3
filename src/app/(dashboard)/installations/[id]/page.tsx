import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InstallationFeedback } from '@/components/installations/installation-feedback'
import { BackButton } from '@/components/ui/back-button'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getInstallation(id: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return null

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return null

  const adminSupabase = await createAdminClient()

  // Fetch installation with related design and customer
  const { data } = await adminSupabase
    .from('installations')
    .select(`
      *,
      customers(id, name, phone, house_type),
      designs(id, title, room_count, total_area, final_price, description, cad_file, cad_file_url, kujiale_link)
    `)
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  return data
}

const statusLabels: Record<string, string> = {
  pending: '待安装',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

// Demo data
const DEMO_INSTALLATION = {
  id: 'demo-installation-1',
  status: 'pending',
  scheduled_date: null,
  feedback: null,
  customers: { name: '张三', phone: '13800138000' },
  designs: { title: 'XX小区A户型设计方案' },
  created_at: new Date().toISOString(),
}

export default async function InstallationDetailPage({ params }: { params: { id: string } }) {
  // Validate UUID
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id) && !params.id.startsWith('demo-')) {
    return <div className="p-6">无效的安装单ID</div>
  }

  let installation: any = await getInstallation(params.id)
  if (!installation) {
    installation = DEMO_INSTALLATION
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null
  // 只有店长和管理员可以更新安装单状态
  const canEdit = user && ['owner', 'manager'].includes(user.role)
  // 根据状态决定返回哪个列表
  const backHref = installation.status === 'completed' || installation.status === 'cancelled'
    ? '/completed-orders'
    : '/installations'
  const backLabel = installation.status === 'completed' || installation.status === 'cancelled'
    ? '返回已完成订单'
    : '返回安装列表'

  return (
    <div className="space-y-6">
      <div>
        <BackButton href={backHref} label={backLabel} />
        <h1 className="text-2xl font-semibold mt-2">安装单详情</h1>
        <p className="text-muted-foreground">客户：{installation.customers?.name || '未知'}</p>
      </div>

      {/* 客户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">客户姓名：</span>
              {installation.customers?.name || '未知'}
            </div>
            <div>
              <span className="text-muted-foreground">联系电话：</span>
              {installation.customers?.phone || '无'}
            </div>
            <div>
              <span className="text-muted-foreground">房型：</span>
              {installation.customers?.house_type || '未知'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 方案信息 */}
      {installation.designs && (
        <Card>
          <CardHeader>
            <CardTitle>方案信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">方案名称：</span>
                {installation.designs.title || '无'}
              </div>
              <div>
                <span className="text-muted-foreground">房间数量：</span>
                {installation.designs.room_count ? `${installation.designs.room_count}室` : '未知'}
              </div>
              <div>
                <span className="text-muted-foreground">总面积：</span>
                {installation.designs.total_area ? `${installation.designs.total_area}㎡` : '未知'}
              </div>
              <div>
                <span className="text-muted-foreground">成交价：</span>
                {installation.designs.final_price ? `¥${installation.designs.final_price.toLocaleString()}` : '待定'}
              </div>
            </div>
            {installation.designs.description && (
              <div className="mt-3">
                <span className="text-muted-foreground">方案描述：</span>
                <p className="text-sm mt-1">{installation.designs.description}</p>
              </div>
            )}
            <div className="flex gap-4 mt-3">
              {installation.designs.cad_file_url && (
                <a
                  href={installation.designs.cad_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  下载 CAD 图纸
                </a>
              )}
              {installation.designs.kujiale_link && (
                <a
                  href={installation.designs.kujiale_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  查看酷家乐方案
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 安装信息 */}
      <Card>
        <CardHeader>
          <CardTitle>安装信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">预约日期：</span>
              {installation.scheduled_date || '待定'}
            </div>
            <div>
              <span className="text-muted-foreground">当前状态：</span>
              {statusLabels[installation.status] || installation.status}
            </div>
          </div>
          {installation.feedback && (
            <div className="mt-4">
              <span className="text-muted-foreground">反馈：</span>
              <p className="text-sm mt-1">{installation.feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>更新状态</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <InstallationFeedback
              installationId={installation.id}
              currentStatus={installation.status}
            />
          ) : (
            <p className="text-sm text-muted-foreground">无编辑权限</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
