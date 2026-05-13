import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)
const sourcePath = path.join(root, 'src/lib/dashboard-overview.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const module = { exports: {} }
vm.runInNewContext(compiled.outputText, {
  exports: module.exports,
  module,
  require,
})

const { buildDashboardOverview } = module.exports

const orders = [
  { id: '1', order_no: 'DD-001', customer_name: '客户A', status: 'pending_dispatch', updated_at: '2026-04-27T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 1000, final_order_amount: null, created_by: 'sales-1', assigned_designer: null, assigned_installer: null },
  { id: '2', order_no: 'DD-002', customer_name: '客户B', status: 'pending_design', updated_at: '2026-04-26T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 2000, final_order_amount: null, created_by: 'sales-1', assigned_designer: 'designer-1', assigned_installer: null },
  { id: '3', order_no: 'DD-003', customer_name: '客户C', status: 'designing', updated_at: '2026-04-25T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 3000, final_order_amount: null, created_by: 'sales-2', assigned_designer: 'designer-1', assigned_installer: null },
  { id: '4', order_no: 'DD-004', customer_name: '客户D', status: 'pending_order', updated_at: '2026-04-24T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 4000, final_order_amount: 4500, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: null },
  { id: '5', order_no: 'DD-005', customer_name: '客户E', status: 'pending_payment', updated_at: '2026-04-23T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 5000, final_order_amount: null, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: null },
  { id: '6', order_no: 'DD-006', customer_name: '客户F', status: 'pending_shipment', updated_at: '2026-04-22T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 6000, final_order_amount: null, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: 'installer-1' },
  { id: '7', order_no: 'DD-007', customer_name: '客户G', status: 'in_install', updated_at: '2026-04-21T08:00:00Z', created_at: '2026-04-20T08:00:00Z', signed_amount: 7000, final_order_amount: null, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: 'installer-1' },
  { id: '8', order_no: 'DD-008', customer_name: '客户H', status: 'completed', completed_at: '2026-04-20T08:00:00Z', updated_at: '2026-04-20T08:00:00Z', created_at: '2026-04-10T08:00:00Z', signed_amount: 8000, final_order_amount: 9000, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: 'installer-1' },
  { id: '9', order_no: 'DD-009', customer_name: '客户I', status: 'completed', completed_at: '2026-03-20T08:00:00Z', updated_at: '2026-03-20T08:00:00Z', created_at: '2026-03-10T08:00:00Z', signed_amount: 9000, final_order_amount: null, created_by: 'sales-2', assigned_designer: 'designer-2', assigned_installer: 'installer-1' },
]

const users = [
  { id: 'sales-1', display_name: '销售甲' },
  { id: 'sales-2', email: 'sales2@example.com' },
  { id: 'designer-1', display_name: '设计甲' },
  { id: 'designer-2', display_name: '设计乙' },
  { id: 'installer-1', display_name: '安装甲' },
]

const overview = buildDashboardOverview({
  orders,
  users,
  now: new Date('2026-04-28T12:00:00Z'),
})

assert.equal(
  JSON.stringify(overview.cards.map((card) => [card.key, card.count])),
  JSON.stringify([
    ['order_creation', 0],
    ['pending_dispatch', 1],
    ['design', 2],
    ['pending_order', 1],
    ['pending_payment', 1],
    ['install', 2],
    ['after_sales', 0],
    ['completed_this_month', 1],
    ['cancelled_this_month', 0],
  ])
)

assert.equal(overview.processOrders.length, 7)
assert.equal(overview.processOrders[0].orderNo, 'DD-001')
assert.equal(overview.processOrders[0].stageLabel, '待派单')
assert.equal(overview.processOrders[0].nextAction, '分配设计师')
assert.equal(overview.processOrders[1].designerName, '设计甲')
assert.equal(overview.processOrders[4].amount, 5000)
assert.equal(overview.processOrders[5].installerName, '安装甲')
