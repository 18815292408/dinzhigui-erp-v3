import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { DesignEditForm } from '@/components/designs/design-edit-form'
import { DesignDeleteButton } from '@/components/designs/design-delete-button'
import { FormSubmitButton } from '@/components/ui/form-submit-button'
import { BackButton } from '@/components/ui/back-button'

const statusConfig = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-800' },
}

async function getDesign(id: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return null

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return null

  const adminSupabase = await createAdminClient()
  const { data } = await adminSupabase
    .from('designs')
    .select('*, customers(id, name, phone, house_type)')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  return data
}

// Demo data
const DEMO_DESIGN = {
  id: 'demo-design-1',
  title: 'XX小区A户型设计方案',
  room_count: 3,
  total_area: 120.5,
  final_price: 150000,
  description: '现代简约风格，全屋定制...',
  status: 'submitted',
  customer_id: 'demo-customer-1',
  organization_id: '00000000-0000-0000-0000-000000000001',
  customers: { name: '张三', phone: '13800138000' },
  users: { display_name: '演示设计师' },
  created_at: new Date().toISOString(),
}

// Server Action to submit design (draft → submitted)
async function submitDesignAction(designId: string) {
  'use server'
  const adminSupabase = await createAdminClient()
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return

  const { error } = await adminSupabase
    .from('designs')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', designId)
    .eq('organization_id', user.organization_id)

  if (!error) {
    redirect(`/designs/${designId}`)
  }
}

// Server Action to confirm design (submitted → confirmed)
async function confirmDesignAction(designId: string, customerId: string | null) {
  'use server'
  const adminSupabase = await createAdminClient()
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return

  // Update design status
  await adminSupabase
    .from('designs')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', designId)
    .eq('organization_id', user.organization_id)

  // Create installation if customer_id exists
  if (customerId) {
    await adminSupabase.from('installations').insert({
      organization_id: user.organization_id,
      customer_id: customerId,
      design_id: designId,
      assigned_to: null,
      status: 'pending',
      scheduled_date: null,
      completed_at: null,
      feedback: null,
      issues: '[]',
    })
  }

  redirect('/designs')
}

// Server Action to rollback design status (设计师 only)
async function rollbackDesignAction(designId: string, targetStatus: 'draft' | 'submitted') {
  'use server'
  const adminSupabase = await createAdminClient()
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return

  const user = parseSessionUser(sessionCookie.value)
  if (!user || user.role !== 'designer') return // 只有设计师可以回退

  const { error } = await adminSupabase
    .from('designs')
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq('id', designId)
    .eq('created_by', user.id) // 设计师只能回退自己创建的方案

  if (!error) {
    redirect(`/designs/${designId}`)
  }
}


export default async function DesignDetailPage({ params }: { params: { id: string } }) {
  // Validate UUID
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id) && !params.id.startsWith('demo-')) {
    return <div className="p-6">无效的方案ID</div>
  }

  let design: any = await getDesign(params.id)
  if (!design) {
    design = DEMO_DESIGN
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null
  const canEdit = user && ['owner', 'manager', 'designer'].includes(user.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/designs" label="返回方案列表" />
          <h1 className="text-2xl font-semibold mt-2">{design.title}</h1>
          <p className="text-muted-foreground">
            客户：{design.customers?.name} {design.customers?.house_type && `(${design.customers.house_type})`} · 联系方式：{design.customers?.phone || '无'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={statusConfig[design.status as keyof typeof statusConfig]?.color}>
            {statusConfig[design.status as keyof typeof statusConfig]?.label}
          </Badge>
        </div>
      </div>

      {/* 草稿状态：显示编辑表单 */}
      {design.status === 'draft' && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>编辑方案</CardTitle>
          </CardHeader>
          <CardContent>
            <DesignEditForm design={design} />
          </CardContent>
        </Card>
      )}
      {design.status === 'draft' && !canEdit && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">无编辑权限</p>
          </CardContent>
        </Card>
      )}

      {/* 已提交/已确认：显示只读信息 */}
      {design.status !== 'draft' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">房间数量</p>
              <p className="font-medium">{design.room_count || '未填写'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">总面积</p>
              <p className="font-medium">{design.total_area ? `${design.total_area} ㎡` : '未填写'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">成交价</p>
              <p className="font-medium">{design.final_price ? `¥${design.final_price.toLocaleString()}` : '待定'}</p>
            </div>
          </div>

          {design.description && (
            <Card>
              <CardHeader>
                <CardTitle>方案描述</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{design.description}</p>
              </CardContent>
            </Card>
          )}

          {(design.kujiale_link || design.cad_file_url) && (
            <div className="grid grid-cols-2 gap-4">
              {design.kujiale_link && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">酷家乐链接</p>
                  <a
                    href={design.kujiale_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {design.kujiale_link}
                  </a>
                </div>
              )}
              {design.cad_file_url && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">CAD文件</p>
                  <a
                    href={design.cad_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {design.cad_file || '点击下载'}
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 操作按钮 */}
      {design.status === 'draft' && canEdit && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">方案完善后提交给客户确认</p>
          <div className="flex gap-4">
            <form action={async () => {
              'use server'
              await submitDesignAction(design.id)
            }}>
              <FormSubmitButton>提交方案</FormSubmitButton>
            </form>
            <DesignDeleteButton designId={design.id} />
          </div>
        </div>
      )}

      {design.status === 'submitted' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">确认后将自动创建安装单</p>
          <div className="flex gap-4">
            <form action={async () => {
              'use server'
              await confirmDesignAction(design.id, design.customer_id)
            }}>
              <FormSubmitButton>确认方案并创建安装单</FormSubmitButton>
            </form>
            {user?.role === 'designer' && user.id === design.created_by && (
              <form action={async () => {
                'use server'
                await rollbackDesignAction(design.id, 'draft')
              }}>
                <FormSubmitButton variant="outline">撤回至草稿</FormSubmitButton>
              </form>
            )}
          </div>
        </div>
      )}

      {design.status === 'confirmed' && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-green-800 font-medium">方案已确认</p>
            <Link href="/installations" className="text-sm text-blue-600 hover:underline">
              查看安装单 →
            </Link>
          </div>
          {user?.role === 'designer' && user.id === design.created_by && (
            <form action={async () => {
              'use server'
              await rollbackDesignAction(design.id, 'submitted')
            }}>
              <FormSubmitButton variant="outline">撤回至已提交</FormSubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
