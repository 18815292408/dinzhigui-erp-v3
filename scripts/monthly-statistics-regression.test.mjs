import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)
const sourcePath = path.join(root, 'src/lib/monthly-statistics.ts')
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

const { buildMonthlyStatistics } = module.exports

const users = [
  { id: 'sales-1', display_name: '销售甲' },
  { id: 'designer-1', display_name: '设计甲' },
  { id: 'sales-2', display_name: null, email: 'sales2@example.com' },
  { id: 'designer-2', display_name: null, email: 'designer2@example.com' },
]

const orders = [
  {
    id: 'order-1',
    order_no: 'DD-001',
    customer_name: '客户一',
    created_by: 'sales-1',
    assigned_designer: 'designer-1',
    created_at: '2026-04-03T08:00:00.000Z',
    updated_at: '2026-04-10T08:00:00.000Z',
    signed_amount: 10000,
    final_order_amount: 15000,
    payment_status: 'paid',
    payment_confirmed_at: '2026-04-12T08:00:00.000Z',
    factory_records: [
      { factory_name: 'A厂', amount: 9000 },
      { factory_name: 'B厂', amount: 6000 },
    ],
    status: 'pending_shipment',
  },
  {
    id: 'order-2',
    order_no: 'DD-002',
    customer_name: '客户二',
    created_by: 'sales-1',
    assigned_designer: 'designer-1',
    created_at: '2026-04-15T08:00:00.000Z',
    updated_at: '2026-04-20T08:00:00.000Z',
    signed_amount: 8000,
    final_order_amount: null,
    payment_status: 'unpaid',
    payment_confirmed_at: null,
    factory_records: [{ factory_name: 'C厂', amount: 7000 }],
    status: 'pending_payment',
  },
  {
    id: 'order-3',
    order_no: 'DD-003',
    customer_name: '客户三',
    created_by: 'sales-1',
    assigned_designer: 'designer-1',
    created_at: '2026-03-30T08:00:00.000Z',
    updated_at: '2026-04-02T08:00:00.000Z',
    signed_amount: 5000,
    final_order_amount: 5500,
    payment_status: 'paid',
    payment_confirmed_at: '2026-05-01T08:00:00.000Z',
    factory_records: [{ factory_name: 'D厂', amount: 5500 }],
    status: 'pending_shipment',
  },
  {
    id: 'order-4',
    order_no: 'DD-004',
    customer_name: '客户四',
    created_by: 'sales-2',
    assigned_designer: null,
    created_at: '2026-04-18T08:00:00.000Z',
    updated_at: '2026-04-18T08:00:00.000Z',
    signed_amount: 3000,
    final_order_amount: null,
    payment_status: 'unpaid',
    payment_confirmed_at: null,
    factory_records: [],
    status: 'pending_design',
  },
  {
    id: 'order-5',
    order_no: 'DD-005',
    customer_name: 'customer five',
    created_by: 'sales-1',
    assigned_designer: null,
    design_created_by: 'designer-2',
    created_at: '2026-03-18T08:00:00.000Z',
    updated_at: '2026-04-22T08:00:00.000Z',
    signed_amount: 4000,
    final_order_amount: null,
    payment_status: 'unpaid',
    payment_confirmed_at: null,
    factory_records: [{ factory_name: 'E', amount: 4000 }],
    status: 'pending_payment',
  },
]

const stats = buildMonthlyStatistics({ year: 2026, month: 4, orders, users })

assert.equal(stats.summary.sales_order_count, 3)
assert.equal(stats.summary.sales_signed_amount, 21000)
assert.equal(stats.summary.sales_paid_amount, 15000)
assert.equal(stats.summary.designer_order_count, 4)
assert.equal(stats.summary.designer_order_amount, 31500)

assert.equal(stats.sales[0].name, '销售甲')
assert.equal(stats.sales[0].signed_count, 2)
assert.equal(stats.sales[0].signed_amount, 18000)
assert.equal(stats.sales[0].paid_amount, 15000)
assert.equal(stats.sales[0].orders.length, 2)
assert.equal(stats.sales[0].payments.length, 1)
assert.equal(stats.sales[0].payments[0].amount, 15000)
assert.equal(stats.sales[1].name, 'sales2@example.com')

assert.equal(stats.designers[0].name, '设计甲')
assert.equal(stats.designers[0].order_count, 3)
assert.equal(stats.designers[0].total_amount, 27500)
assert.equal(stats.designers[0].orders[2].amount, 5500)
assert.equal(stats.designers[1].name, 'designer2@example.com')
assert.equal(stats.designers[1].order_count, 1)
