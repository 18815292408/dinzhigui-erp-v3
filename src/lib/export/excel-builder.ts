import ExcelJS from 'exceljs'
import { normalizeFeedbackRecords } from './feedback-utils'

export interface ExportOrder {
  id: string
  order_no: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  house_type: string | null
  house_area: number | null
  signed_amount: number | null
  final_order_amount: number | null
  payment_status: string | null
  created_at: string | null
  completed_at: string | null
  status: string | null
  created_by_name: string | null
  assigned_designer_name: string | null
  assigned_installer_name: string | null
  design_title: string | null
  design_room_count: number | null
  design_total_area: number | null
  design_final_price: number | null
  design_price: number | null
  design_cad_file: string | null
  design_cad_file_url: string | null
  design_kujiale_link: string | null
  design_description: string | null
  installation_status: string | null
  installation_completed_at: string | null
  installation_feedback: unknown
  installation_after_sales_feedback: unknown
  factory_records: unknown
  remarks: unknown
}

const GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }
const LIGHT_GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
const LIGHT_GRAY_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
}

function formatDate(v: string | null): string {
  if (!v) return '-'
  try { return new Date(v).toLocaleString('zh-CN') } catch { return String(v) }
}

function formatMoney(v: number | null): string {
  if (v == null) return '-'
  return `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function labelCell(ws: ExcelJS.Worksheet, row: number, col: number, text: string) {
  const c = ws.getCell(row, col)
  c.value = text
  c.font = { bold: true, size: 11, color: { argb: 'FF374151' } }
  c.fill = LIGHT_GRAY_FILL
  c.alignment = { vertical: 'middle', wrapText: true }
  c.border = THIN_BORDER
}

function valueCell(ws: ExcelJS.Worksheet, row: number, col: number, text: string) {
  const c = ws.getCell(row, col)
  c.value = text
  c.font = { size: 11, color: { argb: 'FF1F2937' } }
  c.alignment = { vertical: 'middle', wrapText: true }
  c.border = THIN_BORDER
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, colStart: number, title: string) {
  ws.mergeCells(row, colStart, row, colStart + 1)
  const c = ws.getCell(row, colStart)
  c.value = title
  c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  c.fill = GREEN_FILL
  c.alignment = { horizontal: 'left', vertical: 'middle' }
  c.border = THIN_BORDER
  const c2 = ws.getCell(row, colStart + 1)
  c2.fill = GREEN_FILL
  c2.border = THIN_BORDER
}

function addSection(
  ws: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  fields: [string, string][],
): number {
  let r = startRow
  sectionHeader(ws, r, 1, title)
  r++
  for (const [label, value] of fields) {
    if (value) {
      labelCell(ws, r, 1, label)
      valueCell(ws, r, 2, value)
      r++
    }
  }
  return r
}

function formatFeedbackText(value: unknown): string {
  const records = normalizeFeedbackRecords(value)
  if (records.length === 0) return ''
  return records.map((r) => `[${formatDate(r.date)}] ${r.content}`).join('\n')
}

function formatFactoryText(value: unknown): string {
  if (!value) return ''
  let arr: any[] = []
  if (Array.isArray(value)) arr = value
  else if (typeof value === 'string') {
    try { arr = JSON.parse(value) } catch { return '' }
  }
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr.map((r) => {
    const name = r.factory_name || '未知工厂'
    const amt = r.amount != null ? formatMoney(r.amount) : '-'
    return `${name}: ${amt}`
  }).join('\n')
}

function formatRemarksText(value: unknown): string {
  if (!value) return ''
  let arr: any[] = []
  if (Array.isArray(value)) arr = value
  else if (typeof value === 'string') {
    try { arr = JSON.parse(value) } catch { return '' }
  }
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n')
}

export async function buildSingleOrderExcel(order: ExportOrder): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('订单信息')

  ws.columns = [
    { key: 'label', width: 18 },
    { key: 'value', width: 45 },
  ]

  ws.views = [{ state: 'normal' }]

  let r = 1

  ws.mergeCells(r, 1, r, 2)
  const titleCell = ws.getCell(r, 1)
  titleCell.value = `订单信息表`
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF059669' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 36
  r++

  ws.mergeCells(r, 1, r, 2)
  const subtitle = ws.getCell(r, 1)
  subtitle.value = `订单号：${order.order_no || '-'}    客户：${order.customer_name || '-'}`
  subtitle.font = { size: 12, color: { argb: 'FF6B7280' } }
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 24
  r += 2

  r = addSection(ws, r, '客户信息', [
    ['客户姓名', order.customer_name || ''],
    ['联系电话', order.customer_phone || ''],
    ['联系地址', order.customer_address || ''],
    ['房型', order.house_type || ''],
    ['面积', order.house_area ? `${order.house_area} ㎡` : ''],
  ])
  r++

  r = addSection(ws, r, '订单信息', [
    ['订单号', order.order_no || ''],
    ['订单状态', order.status === 'completed' ? '已完成' : order.status === 'cancelled' ? '已退订' : order.status || ''],
    ['签单金额', formatMoney(order.signed_amount)],
    ['最终金额', formatMoney(order.final_order_amount)],
    ['付款状态', order.payment_status === 'paid' ? '已付款' : '未付款'],
    ['创建时间', formatDate(order.created_at)],
    ['完成时间', formatDate(order.completed_at)],
  ])
  r++

  r = addSection(ws, r, '人员信息', [
    ['创建人', order.created_by_name || ''],
    ['设计师', order.assigned_designer_name || ''],
    ['安装师', order.assigned_installer_name || ''],
  ])
  r++

  r = addSection(ws, r, '设计方案', [
    ['方案名称', order.design_title || ''],
    ['房间数', order.design_room_count ? `${order.design_room_count} 室` : ''],
    ['总面积', order.design_total_area ? `${order.design_total_area} ㎡` : ''],
    ['方案金额', formatMoney(order.design_final_price ?? order.design_price)],
    ['CAD 图纸', order.design_cad_file ? order.design_cad_file.split('/').pop() || order.design_cad_file : ''],
    ['酷家乐链接', order.design_kujiale_link || ''],
    ['方案描述', order.design_description || ''],
  ])
  r++

  r = addSection(ws, r, '安装信息', [
    ['安装状态', order.installation_status === 'completed' ? '已完成' : order.installation_status || ''],
    ['安装完成时间', formatDate(order.installation_completed_at)],
    ['安装反馈', formatFeedbackText(order.installation_feedback)],
    ['售后反馈', formatFeedbackText(order.installation_after_sales_feedback)],
  ])
  r++

  const factoryText = formatFactoryText(order.factory_records)
  if (factoryText) {
    r = addSection(ws, r, '工厂记录', [['工厂记录', factoryText]])
    r++
  }

  const remarksText = formatRemarksText(order.remarks)
  if (remarksText) {
    r = addSection(ws, r, '备注', [['备注', remarksText]])
  }

  ws.getColumn(1).width = 18
  ws.getColumn(2).width = 48

  return await wb.xlsx.writeBuffer() as ExcelJS.Buffer
}
