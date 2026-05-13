import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)

// 测试 order-workflow.ts
const workflowPath = path.join(root, 'src/lib/order-workflow.ts')
const workflowSource = fs.readFileSync(workflowPath, 'utf8')
const workflowCompiled = ts.transpileModule(workflowSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const workflowModule = { exports: {} }
vm.runInNewContext(workflowCompiled.outputText, {
  exports: workflowModule.exports,
  module: workflowModule,
  require,
})

const {
  CANCELLED_ORDER_STATUS,
  TERMINAL_ORDER_STATUSES,
  isActiveOrderStatus,
  isTerminalOrderStatus,
  shouldShowCustomerInFollowup,
  shouldShowInstallationInActiveList,
} = workflowModule.exports

// 测试 permissions.ts
const permissionsPath = path.join(root, 'src/lib/permissions.ts')
const permissionsSource = fs.readFileSync(permissionsPath, 'utf8')
const permissionsCompiled = ts.transpileModule(permissionsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const permissionsModule = { exports: {} }
vm.runInNewContext(permissionsCompiled.outputText, {
  exports: permissionsModule.exports,
  module: permissionsModule,
  require,
})

const { canCancelOrder } = permissionsModule.exports

// ====== order-workflow 测试 ======

assert.equal(CANCELLED_ORDER_STATUS, 'cancelled', 'CANCELLED_ORDER_STATUS should be "cancelled"')
assert.equal(JSON.stringify(TERMINAL_ORDER_STATUSES), JSON.stringify(['completed', 'cancelled']), 'TERMINAL_ORDER_STATUSES should include completed and cancelled')

assert.equal(isTerminalOrderStatus('completed'), true, 'completed should be terminal')
assert.equal(isTerminalOrderStatus('cancelled'), true, 'cancelled should be terminal')
assert.equal(isTerminalOrderStatus('in_install'), false, 'in_install should not be terminal')
assert.equal(isTerminalOrderStatus(null), false, 'null should not be terminal')
assert.equal(isTerminalOrderStatus(undefined), false, 'undefined should not be terminal')

assert.equal(isActiveOrderStatus('cancelled'), false, 'cancelled should not be active')
assert.equal(isActiveOrderStatus('completed'), false, 'completed should not be active')
assert.equal(isActiveOrderStatus('in_install'), true, 'in_install should be active')

// 已退订订单不应显示在跟进列表
assert.equal(
  shouldShowCustomerInFollowup({
    orders: [{ status: 'cancelled' }],
    designs: [],
  }),
  false,
  'cancelled orders must not keep customers in followup'
)

// 有活跃订单的客户应显示在跟进列表
assert.equal(
  shouldShowCustomerInFollowup({
    orders: [{ status: 'in_install' }],
    designs: [],
  }),
  true,
  'active orders still belong in followup'
)

// 已退订订单的安装记录不应显示在活跃列表
assert.equal(
  shouldShowInstallationInActiveList({
    status: 'pending',
    order: { status: 'cancelled' },
    customerOrders: [],
  }),
  false,
  'pending installation records for cancelled orders must not appear in active installation management'
)

// ====== permissions 测试 ======

const mockOwner = { id: 'owner-1', role: 'owner', organization_id: 'org-1' }
const mockManager = { id: 'manager-1', role: 'manager', organization_id: 'org-1' }
const mockSales = { id: 'sales-1', role: 'sales', organization_id: 'org-1' }
const mockDesigner = { id: 'designer-1', role: 'designer', organization_id: 'org-1' }
const mockInstaller = { id: 'installer-1', role: 'installer', organization_id: 'org-1' }

// 老板可以退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'in_install', installation_status: 'installing', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockOwner
  ),
  true,
  'owner should be able to cancel order'
)

// 店长可以退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'in_install', installation_status: 'installing', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockManager
  ),
  true,
  'manager should be able to cancel order'
)

// 销售可以退订自己创建的订单
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'pending_payment', installation_status: 'pending_ship', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockSales
  ),
  true,
  'sales should be able to cancel their own order'
)

// 销售不能退订别人的订单
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'pending_payment', installation_status: 'pending_ship', created_by: 'sales-2', assigned_designer: 'designer-1' },
    mockSales
  ),
  false,
  'sales should not be able to cancel others order'
)

// 设计师可以退订分配给自己的订单
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'designing', installation_status: 'pending_ship', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockDesigner
  ),
  true,
  'designer should be able to cancel their assigned order'
)

// 设计师不能退订未分配给自己的订单
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'designing', installation_status: 'pending_ship', created_by: 'sales-1', assigned_designer: 'designer-2' },
    mockDesigner
  ),
  false,
  'designer should not be able to cancel unassigned order'
)

// 安装人员不能退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'in_install', installation_status: 'installing', created_by: 'sales-1', assigned_designer: 'designer-1', assigned_installer: 'installer-1' },
    mockInstaller
  ),
  false,
  'installer should not be able to cancel order'
)

// 已完成的订单不能退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'completed', installation_status: 'installed', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockOwner
  ),
  false,
  'completed order should not be cancellable'
)

// 已退订的订单不能再次退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'cancelled', installation_status: 'pending_ship', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockOwner
  ),
  false,
  'cancelled order should not be cancellable again'
)

// 已安装的订单不能退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-1', status: 'in_after_sales', installation_status: 'installed', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockOwner
  ),
  false,
  'installed order should not be cancellable'
)

// 跨组织不能退订
assert.equal(
  canCancelOrder(
    { organization_id: 'org-2', status: 'in_install', installation_status: 'installing', created_by: 'sales-1', assigned_designer: 'designer-1' },
    mockOwner
  ),
  false,
  'cross-organization cancel should be denied'
)

console.log('All cancel-order regression tests passed!')
