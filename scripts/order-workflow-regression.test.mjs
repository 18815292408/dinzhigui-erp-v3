import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)
const sourcePath = path.join(root, 'src/lib/order-workflow.ts')
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

const {
  ACTIVE_ORDER_STATUSES,
  ACTIVE_INSTALLATION_STATUSES,
  buildInstallationCardView,
  buildCompletedOrderCardView,
  orderBelongsToCustomer,
  shouldShowCustomerInCreateList,
  shouldShowCustomerInFollowup,
  shouldShowInstallationInActiveList,
} = module.exports

assert.deepEqual(ACTIVE_ORDER_STATUSES.includes('completed'), false)
assert.equal(JSON.stringify(ACTIVE_INSTALLATION_STATUSES), JSON.stringify(['pending', 'in_progress']))

assert.equal(
  shouldShowCustomerInFollowup({
    orders: [{ status: 'completed' }],
    designs: [{ status: 'submitted', orderStatus: 'completed' }],
  }),
  false,
  'completed orders must not keep customers in followup'
)

assert.equal(
  shouldShowCustomerInFollowup({
    orders: [{ status: 'in_install' }],
    designs: [],
  }),
  true,
  'active orders still belong in followup'
)

assert.equal(
  orderBelongsToCustomer(
    { id: 'customer-1', name: '张三', phone: '13800000000' },
    { customer_name: '张三', customer_phone: null }
  ),
  true,
  'orders without customer_id should still match customers by name'
)

assert.equal(
  orderBelongsToCustomer(
    { id: 'customer-1', name: '张三', phone: '13800000000' },
    { customer_name: '临时客户', customer_phone: '13800000000' }
  ),
  true,
  'orders without customer_id should still match customers by phone'
)

assert.equal(
  shouldShowCustomerInCreateList({
    orders: [{ status: 'completed' }],
    designs: [],
  }),
  false,
  'customers with completed orders must not return to order creation'
)

assert.equal(
  shouldShowCustomerInCreateList({
    orders: [],
    designs: [],
  }),
  true,
  'customers with no orders or designs still belong in order creation'
)

assert.equal(
  shouldShowInstallationInActiveList({
    status: 'pending',
    order: { status: 'completed' },
    customerOrders: [],
  }),
  false,
  'pending installation records for completed orders must not appear in active installation management'
)

assert.equal(
  shouldShowInstallationInActiveList({
    status: 'pending',
    order: null,
    customerOrders: [{ status: 'completed' }],
  }),
  false,
  'orphan pending installation records for customers with completed orders must not appear in active installation management'
)

assert.equal(
  JSON.stringify(
  buildInstallationCardView({
    customer: null,
    design: null,
    order: {
      customer_name: '王小明',
      customer_phone: '13800000000',
      house_type: '三室一厅',
      order_no: 'SO-001',
    },
  })
  ),
  JSON.stringify({
    customerName: '王小明',
    customerPhone: '13800000000',
    houseType: '三室一厅',
    orderNo: 'SO-001',
    designTitle: null,
    roomCount: null,
    finalPrice: null,
  }),
  'completed cards should fall back to order fields when installation foreign keys are missing'
)

assert.equal(
  JSON.stringify(
    buildCompletedOrderCardView({
      order: {
        id: 'order-1',
        order_no: 'SO-001',
        customer_name: '王小明',
        customer_phone: '13800000000',
        house_type: '三室一厅',
        signed_amount: 12000,
        final_order_amount: 15000,
        completed_at: '2026-04-28T08:00:00.000Z',
      },
      design: { title: '全屋定制', room_count: 3, final_price: 15000 },
      installation: { feedback: '安装完成', completed_at: '2026-04-28T07:50:00.000Z' },
    })
  ),
  JSON.stringify({
    id: 'order-1',
    orderNo: 'SO-001',
    customerName: '王小明',
    customerPhone: '13800000000',
    houseType: '三室一厅',
    designTitle: '全屋定制',
    roomCount: 3,
    amount: 15000,
    completedAt: '2026-04-28T08:00:00.000Z',
    cancelledAt: null,
    cancelledBy: null,
    status: null,
    installationFeedback: '安装完成',
  }),
  'completed order cards should be based on order archive data, not installation route data'
)
