import { cookies } from 'next/headers'
import Link from 'next/link'
import { FollowUpForm } from '@/components/customers/follow-up-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferDesignButton } from '@/components/customers/transfer-design-button'
import { BackButton } from '@/components/ui/back-button'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getCustomer(id: string, organizationId: string) {
  const adminSupabase = await createAdminClient()
  const { data } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  return data
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  // Validate UUID format
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id)) {
    return <div>无效的客户ID</div>
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  // Permission check: owner, manager, sales can edit
  const canEdit = user && ['owner', 'manager', 'sales'].includes(user.role)

  const customer: any = user
    ? await getCustomer(params.id, user.organization_id)
    : null

  if (!customer) {
    return <div className="p-6">客户不存在</div>
  }

  const followUps = typeof customer.follow_ups === 'string'
    ? JSON.parse(customer.follow_ups || '[]')
    : (customer.follow_ups || [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/customers" label="返回客户列表" />
          <h1 className="text-2xl font-semibold mt-2">{customer.name}</h1>
          <p className="text-muted-foreground">{customer.phone}</p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && user && (
            <TransferDesignButton customerId={customer.id} customerName={customer.name} organizationId={user.organization_id} />
          )}
        </div>
      </div>

      {/* 客户信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">房型：</span>
              {customer.house_type || '未填写'}
            </div>
            <div>
              <span className="text-muted-foreground">地址：</span>
              {customer.address || '未填写'}
            </div>
            <div>
              <span className="text-muted-foreground">预估价格：</span>
              {customer.estimated_price ? `¥${customer.estimated_price.toLocaleString()}` : '未填写'}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">需求：</span>
              {customer.requirements || '未填写'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 跟进记录 */}
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {followUps.length > 0 ? followUps.map((up: any, index: number) => (
            <div key={index} className="p-4 border rounded-lg">
              <p className="text-sm">{up.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(up.date).toLocaleString('zh-CN')}
              </p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">暂无跟进记录</p>
          )}
          {canEdit ? (
            <FollowUpForm customerId={customer.id} />
          ) : (
            <p className="text-sm text-muted-foreground">无编辑权限</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
