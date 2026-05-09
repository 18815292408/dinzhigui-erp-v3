import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  isAdmin,
  canViewOrder,
  canEditOrder,
  canDeleteOrder,
  canViewCustomer,
  canViewDesign,
  canViewInstallation,
  filterOrdersByRole,
  filterCustomersByRole,
  getOrderRoleFilter,
} from './permissions'
import { SessionUser } from './types'

const mockOrgId = 'org-1'

const owner: SessionUser = {
  id: 'owner-1',
  email: 'owner@test.com',
  phone: null,
  name: 'Owner',
  role: 'owner',
  organization_id: mockOrgId,
}

const manager: SessionUser = {
  id: 'manager-1',
  email: 'manager@test.com',
  phone: null,
  name: 'Manager',
  role: 'manager',
  organization_id: mockOrgId,
}

const sales: SessionUser = {
  id: 'sales-1',
  email: 'sales@test.com',
  phone: null,
  name: 'Sales',
  role: 'sales',
  organization_id: mockOrgId,
}

const designer: SessionUser = {
  id: 'designer-1',
  email: 'designer@test.com',
  phone: null,
  name: 'Designer',
  role: 'designer',
  organization_id: mockOrgId,
}

const installer: SessionUser = {
  id: 'installer-1',
  email: 'installer@test.com',
  phone: null,
  name: 'Installer',
  role: 'installer',
  organization_id: mockOrgId,
}

const otherOrgUser: SessionUser = {
  id: 'other-1',
  email: 'other@test.com',
  phone: null,
  name: 'Other',
  role: 'sales',
  organization_id: 'org-2',
}

describe('isAdmin', () => {
  it('returns true for owner', () => {
    assert.strictEqual(isAdmin(owner), true)
  })
  it('returns true for manager', () => {
    assert.strictEqual(isAdmin(manager), true)
  })
  it('returns false for sales', () => {
    assert.strictEqual(isAdmin(sales), false)
  })
})

describe('getOrderRoleFilter', () => {
  it('returns null for owner', () => {
    assert.strictEqual(getOrderRoleFilter(owner), null)
  })
  it('returns created_by filter for sales', () => {
    assert.deepStrictEqual(getOrderRoleFilter(sales), { field: 'created_by', value: sales.id })
  })
  it('returns assigned_designer filter for designer', () => {
    assert.deepStrictEqual(getOrderRoleFilter(designer), { field: 'assigned_designer', value: designer.id })
  })
  it('returns assigned_installer filter for installer', () => {
    assert.deepStrictEqual(getOrderRoleFilter(installer), { field: 'assigned_installer', value: installer.id })
  })
})

describe('canViewOrder', () => {
  const order = {
    organization_id: mockOrgId,
    created_by: sales.id,
    assigned_designer: designer.id,
    assigned_installer: installer.id,
  }

  it('allows owner to view any order in same org', () => {
    assert.strictEqual(canViewOrder(order, owner), true)
  })
  it('allows manager to view any order in same org', () => {
    assert.strictEqual(canViewOrder(order, manager), true)
  })
  it('allows sales to view own created order', () => {
    assert.strictEqual(canViewOrder(order, sales), true)
  })
  it('denies sales to view others order', () => {
    assert.strictEqual(canViewOrder({ ...order, created_by: 'other-sales' }, sales), false)
  })
  it('allows designer to view assigned order', () => {
    assert.strictEqual(canViewOrder(order, designer), true)
  })
  it('denies designer to view unassigned order', () => {
    assert.strictEqual(canViewOrder({ ...order, assigned_designer: 'other-designer' }, designer), false)
  })
  it('allows installer to view assigned order', () => {
    assert.strictEqual(canViewOrder(order, installer), true)
  })
  it('denies installer to view unassigned order', () => {
    assert.strictEqual(canViewOrder({ ...order, assigned_installer: 'other-installer' }, installer), false)
  })
  it('denies cross-org access', () => {
    assert.strictEqual(canViewOrder(order, otherOrgUser), false)
  })
})

describe('canEditOrder', () => {
  const order = {
    organization_id: mockOrgId,
    created_by: sales.id,
    assigned_designer: designer.id,
    assigned_installer: installer.id,
    status: 'pending_design',
  }

  it('allows owner to edit any order', () => {
    assert.strictEqual(canEditOrder(order, owner), true)
  })
  it('allows sales to edit own order', () => {
    assert.strictEqual(canEditOrder(order, sales), true)
  })
  it('denies sales to edit others order', () => {
    assert.strictEqual(canEditOrder({ ...order, created_by: 'other' }, sales), false)
  })
  it('allows designer to edit assigned design order', () => {
    assert.strictEqual(canEditOrder(order, designer), true)
  })
  it('denies designer to edit order in install phase', () => {
    assert.strictEqual(canEditOrder({ ...order, status: 'in_install' }, designer), false)
  })
  it('allows installer to edit assigned install order', () => {
    assert.strictEqual(canEditOrder({ ...order, status: 'in_install' }, installer), true)
  })
  it('denies installer to edit non-install order', () => {
    assert.strictEqual(canEditOrder(order, installer), false)
  })
})

describe('canDeleteOrder', () => {
  const order = {
    organization_id: mockOrgId,
    created_by: sales.id,
  }

  it('allows owner to delete', () => {
    assert.strictEqual(canDeleteOrder(order, owner), true)
  })
  it('allows manager to delete', () => {
    assert.strictEqual(canDeleteOrder(order, manager), true)
  })
  it('allows sales to delete own order', () => {
    assert.strictEqual(canDeleteOrder(order, sales), true)
  })
  it('denies sales to delete others order', () => {
    assert.strictEqual(canDeleteOrder({ ...order, created_by: 'other' }, sales), false)
  })
  it('denies designer to delete', () => {
    assert.strictEqual(canDeleteOrder(order, designer), false)
  })
  it('denies installer to delete', () => {
    assert.strictEqual(canDeleteOrder(order, installer), false)
  })
})

describe('canViewCustomer', () => {
  const customer = {
    organization_id: mockOrgId,
    created_by: sales.id,
  }

  it('allows owner to view any customer', () => {
    assert.strictEqual(canViewCustomer(customer, owner), true)
  })
  it('allows sales to view own customer', () => {
    assert.strictEqual(canViewCustomer(customer, sales), true)
  })
  it('denies sales to view others customer', () => {
    assert.strictEqual(canViewCustomer({ ...customer, created_by: 'other' }, sales), false)
  })
})

describe('canViewDesign', () => {
  const design = {
    organization_id: mockOrgId,
    created_by: designer.id,
    order_id: 'order-1',
  }
  const order = {
    created_by: sales.id,
    assigned_designer: designer.id,
    assigned_installer: installer.id,
  }

  it('allows owner to view any design', () => {
    assert.strictEqual(canViewDesign(design, order, owner), true)
  })
  it('allows designer to view own design', () => {
    assert.strictEqual(canViewDesign(design, order, designer), true)
  })
  it('allows sales to view related order design', () => {
    assert.strictEqual(canViewDesign(design, order, sales), true)
  })
  it('denies sales to view unrelated order design', () => {
    assert.strictEqual(canViewDesign(design, { ...order, created_by: 'other' }, sales), false)
  })
})

describe('canViewInstallation', () => {
  const installation = {
    organization_id: mockOrgId,
    assigned_to: installer.id,
    created_by: installer.id,
    order_id: 'order-1',
  }
  const order = {
    created_by: sales.id,
    assigned_designer: designer.id,
    assigned_installer: installer.id,
  }

  it('allows owner to view any installation', () => {
    assert.strictEqual(canViewInstallation(installation, order, owner), true)
  })
  it('allows installer to view assigned installation', () => {
    assert.strictEqual(canViewInstallation(installation, order, installer), true)
  })
  it('allows sales to view related order installation', () => {
    assert.strictEqual(canViewInstallation(installation, order, sales), true)
  })
})

describe('filterOrdersByRole', () => {
  const orders = [
    { organization_id: mockOrgId, created_by: sales.id, assigned_designer: null as string | null, assigned_installer: null as string | null },
    { organization_id: mockOrgId, created_by: 'other', assigned_designer: designer.id, assigned_installer: null as string | null },
    { organization_id: 'org-2', created_by: sales.id, assigned_designer: null as string | null, assigned_installer: null as string | null },
  ]

  it('filters orders for sales', () => {
    const filtered = filterOrdersByRole(orders, sales)
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].created_by, sales.id)
  })
})

describe('filterCustomersByRole', () => {
  const customers = [
    { organization_id: mockOrgId, created_by: sales.id },
    { organization_id: mockOrgId, created_by: 'other' },
    { organization_id: 'org-2', created_by: sales.id },
  ]

  it('filters customers for sales', () => {
    const filtered = filterCustomersByRole(customers, sales)
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].created_by, sales.id)
  })
})
