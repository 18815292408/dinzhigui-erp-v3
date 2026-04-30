import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InstallationFeedback } from '@/components/installations/installation-feedback'
import { BackButton } from '@/components/ui/back-button'
import { buildInstallationCardView } from '@/lib/order-workflow'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { formatMoney } from '@/lib/format-amount'

async function getInstallation(id: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return null

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return null

  const adminSupabase = await createAdminClient()

  const { data } = await adminSupabase
    .from('installations')
    .select(`
      *,
      customers(id, name, phone, house_type),
      designs(id, title, room_count, total_area, final_price, price, description, cad_file, cad_file_url, kujiale_link),
      orders(id, order_no, estimated_shipment_date, assigned_installer, installation_status, customer_name, customer_phone, house_type)
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

export default async function InstallationDetailPage({ params }: { params: { id: string } }) {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id)) {
    return <div className="p-6">无效的安装单ID</div>
  }

  const installation: any = await getInstallation(params.id)
  if (!installation) {
    return <div className="p-6">安装单不存在</div>
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null
  const isAssignedInstaller = user?.id === installation.assigned_to
  const canEdit = Boolean(user && (['owner', 'manager'].includes(user.role) || isAssignedInstaller))
  const backHref = installation.status === 'completed' || installation.status === 'cancelled'
    ? '/completed-orders'
    : '/installations'
  const backLabel = installation.status === 'completed' || installation.status === 'cancelled'
    ? '返回已完成订单'
    : '返回安装列表'
  const card = buildInstallationCardView({
    customer: installation.customers,
    design: installation.designs,
    order: installation.orders,
  })

  return (
    <div className="space-y-6">
      <div>
        <BackButton href={backHref} label={backLabel} />
        <h1 className="text-2xl font-semibold mt-2">安装单详情</h1>
        <p className="text-muted-foreground">客户：{card.customerName || '未知'}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">客户姓名：</span>
              {card.customerName || '未知'}
            </div>
            <div>
              <span className="text-muted-foreground">联系电话：</span>
              {card.customerPhone || '无'}
            </div>
            <div>
              <span className="text-muted-foreground">房型：</span>
              {card.houseType || '未知'}
            </div>
          </div>
        </CardContent>
      </Card>

      {installation.designs && (
        <Card>
          <CardHeader>
            <CardTitle>方案信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">方案名称：</span>
                {card.designTitle || '无'}
              </div>
              <div>
                <span className="text-muted-foreground">房间数量：</span>
                {card.roomCount ? `${card.roomCount}室` : '未知'}
              </div>
              <div>
                <span className="text-muted-foreground">总面积：</span>
                {installation.designs.total_area ? `${installation.designs.total_area}㎡` : '未知'}
              </div>
              <div>
                <span className="text-muted-foreground">成交价：</span>
                {formatMoney(card.finalPrice)}
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

      <Card>
        <CardHeader>
          <CardTitle>安装信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">关联订单号：</span>
              {card.orderNo || '无'}
            </div>
            <div>
              <span className="text-muted-foreground">预约日期：</span>
              {installation.scheduled_date || '待定'}
            </div>
            <div>
              <span className="text-muted-foreground">预计出货日期：</span>
              {installation.orders?.estimated_shipment_date || '待填写'}
            </div>
            <div>
              <span className="text-muted-foreground">当前状态：</span>
              {statusLabels[installation.status] || installation.status}
            </div>
          </div>
          {Array.isArray(installation.feedback) && installation.feedback.length > 0 && (
            <div className="mt-4">
              <span className="text-muted-foreground">反馈记录：</span>
              <div className="space-y-2 mt-2">
                {installation.feedback.map((r: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{r.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {r.date ? new Date(r.date).toLocaleString('zh-CN') : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>更新状态</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallationFeedback
            installationId={installation.id}
            orderId={installation.order_id}
            installationStatus={installation.orders?.installation_status || 'pending_ship'}
            estimatedShipmentDate={installation.orders?.estimated_shipment_date || null}
            canEdit={canEdit}
            feedbackRecords={installation.feedback}
          />
        </CardContent>
      </Card>
    </div>
  )
}
