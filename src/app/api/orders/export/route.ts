import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { generateDownloadUrl } from '@/lib/r2/download'
import { buildSingleOrderExcel } from '@/lib/export/excel-builder'
import { buildSingleOrderZip, buildBatchOrdersZip, OrderFiles } from '@/lib/export/zip-builder'

const MAX_EXPORT_COUNT = 50
const CONCURRENT_DOWNLOADS = 5

interface ExportRequest {
  orderIds: string[]
}

async function fetchFileBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`下载失败: ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function encodeFilenameForHeader(filename: string): string {
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape)
  return `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  let body: ExportRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { orderIds } = body
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: '请至少选择一个订单' }, { status: 400 })
  }

  if (orderIds.length > MAX_EXPORT_COUNT) {
    return NextResponse.json(
      { error: `单次最多导出 ${MAX_EXPORT_COUNT} 个订单` },
      { status: 400 }
    )
  }

  const adminSupabase = await createAdminClient()

  const { data: orders, error: ordersError } = await adminSupabase
    .from('orders')
    .select('*')
    .in('id', orderIds)
    .eq('organization_id', user.organization_id)
    .in('status', ['completed', 'cancelled'])

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: '未找到可导出的订单' }, { status: 404 })
  }

  const foundIds = new Set(orders.map((o) => o.id))
  const missingIds = orderIds.filter((id) => !foundIds.has(id))
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `部分订单不存在或无权导出: ${missingIds.join(', ')}` },
      { status: 403 }
    )
  }

  const orderIdsToExport = orders.map((o) => o.id)

  const [{ data: designs }, { data: installations }, { data: users }] =
    await Promise.all([
      adminSupabase
        .from('designs')
        .select(
          'id, order_id, title, room_count, total_area, final_price, price, description, cad_file, cad_file_url, kujiale_link, attachments'
        )
        .in('order_id', orderIdsToExport),
      adminSupabase
        .from('installations')
        .select(
          'id, order_id, status, scheduled_date, completed_at, feedback, after_sales_feedback'
        )
        .in('order_id', orderIdsToExport)
        .order('updated_at', { ascending: false }),
      adminSupabase
        .from('users')
        .select('id, display_name')
        .eq('organization_id', user.organization_id),
    ])

  const userMap = new Map<string, string>()
  if (users) {
    for (const u of users) {
      userMap.set(u.id, u.display_name || '未知')
    }
  }

  const designMap = new Map<string, any>()
  if (designs) {
    for (const d of designs) {
      if (d.order_id) designMap.set(d.order_id, d)
    }
  }

  const installationMap = new Map<string, any>()
  if (installations) {
    for (const inst of installations) {
      if (inst.order_id && !installationMap.has(inst.order_id)) {
        installationMap.set(inst.order_id, inst)
      }
    }
  }

  const exportOrders = orders.map((order) => {
    const design = designMap.get(order.id)
    const installation = installationMap.get(order.id)

    return {
      id: order.id,
      order_no: order.order_no,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      house_type: order.house_type,
      house_area: order.house_area,
      signed_amount: order.signed_amount,
      final_order_amount: order.final_order_amount,
      payment_status: order.payment_status,
      created_at: order.created_at,
      completed_at: order.completed_at,
      status: order.status,
      created_by_name: order.created_by
        ? userMap.get(order.created_by) || order.created_by
        : null,
      assigned_designer_name: order.assigned_designer
        ? userMap.get(order.assigned_designer) || order.assigned_designer
        : null,
      assigned_installer_name: order.assigned_installer
        ? userMap.get(order.assigned_installer) || order.assigned_installer
        : null,
      design_title: design?.title || null,
      design_room_count: design?.room_count || null,
      design_total_area: design?.total_area || null,
      design_final_price: design?.final_price || null,
      design_price: design?.price || null,
      design_cad_file: design?.cad_file || null,
      design_cad_file_url: design?.cad_file_url || null,
      design_kujiale_link: design?.kujiale_link || null,
      design_description: design?.description || null,
      installation_status: installation?.status || null,
      installation_completed_at: installation?.completed_at || null,
      installation_feedback: installation?.feedback || null,
      installation_after_sales_feedback:
        installation?.after_sales_feedback || null,
      factory_records: order.factory_records || null,
      remarks: order.remarks || null,
    }
  })

  const orderFiles: OrderFiles[] = []

  for (const order of exportOrders) {
    const excelBuffer = await buildSingleOrderExcel(order)

    const attachments: { fileName: string; fileBuffer: Buffer }[] = []

    if (order.design_cad_file) {
      try {
        const signedUrl = await generateDownloadUrl(order.design_cad_file)
        const buffer = await fetchFileBuffer(signedUrl)
        const fileName = order.design_cad_file.split('/').pop() || '图纸文件'
        attachments.push({ fileName, fileBuffer: buffer })
      } catch (err) {
        console.error(
          `下载附件失败: ${order.design_cad_file}`,
          err instanceof Error ? err.message : err
        )
      }
    }

    orderFiles.push({
      orderNo: order.order_no || order.id,
      excelBuffer: Buffer.from(excelBuffer),
      attachments,
    })
  }

  const isSingle = orderFiles.length === 1

  if (isSingle) {
    const single = orderFiles[0]
    const zipBuffer = await buildSingleOrderZip(single)
    const orderNo = single.orderNo
    const filename = `${orderNo}.zip`
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': encodeFilenameForHeader(filename),
      },
    })
  }

  const now = new Date()
  const dateLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  const batchZip = await buildBatchOrdersZip(orderFiles)
  const filename = `已完成订单导出_${dateLabel}.zip`

  return new NextResponse(batchZip as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': encodeFilenameForHeader(filename),
    },
  })
}
