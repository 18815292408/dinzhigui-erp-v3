// 统一权限控制工具函数
// 用于在 API 和前端页面中实现数据隔离

import { SessionUser } from './types'

/**
 * 判断用户是否为管理员（owner/manager）
 */
export function isAdmin(user: SessionUser): boolean {
  return user.role === 'owner' || user.role === 'manager'
}

/**
 * 获取订单查询的角色过滤条件
 * 返回一个对象，包含需要在查询中匹配的字段
 */
export function getOrderRoleFilter(user: SessionUser): { field?: string; value?: string } | null {
  switch (user.role) {
    case 'sales':
      return { field: 'created_by', value: user.id }
    case 'designer':
      return { field: 'assigned_designer', value: user.id }
    case 'installer':
      return { field: 'assigned_installer', value: user.id }
    case 'owner':
    case 'manager':
    default:
      return null // owner/manager 可以看到全部
  }
}

/**
 * 获取设计方案查询的角色过滤条件
 */
export function getDesignRoleFilter(user: SessionUser): { field?: string; value?: string } | null {
  switch (user.role) {
    case 'designer':
      return { field: 'created_by', value: user.id }
    case 'sales':
      // 销售只能通过订单关联过滤，返回 null 由调用方处理
      return null
    case 'owner':
    case 'manager':
    default:
      return null
  }
}

/**
 * 获取安装记录查询的角色过滤条件
 */
export function getInstallationRoleFilter(user: SessionUser): { field?: string; value?: string } | null {
  switch (user.role) {
    case 'installer':
      return { field: 'assigned_to', value: user.id }
    case 'sales':
      // 销售需要通过订单关联过滤
      return null
    case 'owner':
    case 'manager':
    default:
      return null
  }
}

/**
 * 检查用户是否有权限查看指定订单
 */
export function canViewOrder(order: {
  created_by?: string | null
  assigned_designer?: string | null
  assigned_installer?: string | null
  organization_id: string
}, user: SessionUser): boolean {
  // 组织隔离
  if (order.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以查看全部
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售只能看自己创建的订单
  if (user.role === 'sales') {
    return order.created_by === user.id
  }

  // 设计师只能看自己负责的订单
  if (user.role === 'designer') {
    return order.assigned_designer === user.id
  }

  // 安装人员只能看自己负责的订单
  if (user.role === 'installer') {
    return order.assigned_installer === user.id
  }

  return false
}

/**
 * 检查用户是否有权限修改指定订单
 */
export function canEditOrder(order: {
  created_by?: string | null
  assigned_designer?: string | null
  assigned_installer?: string | null
  organization_id: string
  status?: string | null
}, user: SessionUser): boolean {
  // 组织隔离
  if (order.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以修改全部
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售只能修改自己创建的订单
  if (user.role === 'sales') {
    return order.created_by === user.id
  }

  // 设计师只能修改分配给自己的、处于设计阶段的订单
  if (user.role === 'designer') {
    const designStatuses = ['pending_design', 'designing', 'pending_order', 'pending_shipment']
    return order.assigned_designer === user.id && designStatuses.includes(order.status || '')
  }

  // 安装人员只能修改分配给自己的、处于安装阶段的订单
  if (user.role === 'installer') {
    return order.assigned_installer === user.id && order.status === 'in_install'
  }

  return false
}

/**
 * 检查用户是否有权限删除指定订单
 */
export function canDeleteOrder(order: {
  created_by?: string | null
  organization_id: string
}, user: SessionUser): boolean {
  // 组织隔离
  if (order.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以删除
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售只能删除自己创建的订单
  if (user.role === 'sales') {
    return order.created_by === user.id
  }

  // 设计师和安装人员不能删除订单
  return false
}

/**
 * 检查用户是否有权限退订指定订单
 * 规则：老板、店长、关联设计师、关联导购可以退订
 * 条件：订单未安装完成（installation_status !== 'installed'）且订单状态不是已完成或已退订
 */
export function canCancelOrder(order: {
  created_by?: string | null
  assigned_designer?: string | null
  assigned_installer?: string | null
  organization_id: string
  status?: string | null
  installation_status?: string | null
}, user: SessionUser): boolean {
  // 组织隔离
  if (order.organization_id !== user.organization_id) {
    return false
  }

  // 已完成或已退订的订单不能退订
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false
  }

  // 已安装的订单不能退订
  if (order.installation_status === 'installed') {
    return false
  }

  // owner/manager 可以退订
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售（导购）可以退订自己创建的订单
  if (user.role === 'sales') {
    return order.created_by === user.id
  }

  // 设计师可以退订分配给自己的订单
  if (user.role === 'designer') {
    return order.assigned_designer === user.id
  }

  return false
}

/**
 * 检查用户是否有权限查看指定客户
 */
export function canViewCustomer(customer: {
  created_by?: string | null
  organization_id: string
}, user: SessionUser): boolean {
  // 组织隔离
  if (customer.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以查看全部
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售只能看自己创建的客户
  if (user.role === 'sales') {
    return customer.created_by === user.id
  }

  // 设计师和安装人员需要通过订单关联判断
  // 由于这里只有客户信息，无法判断关联订单，返回 true 由调用方进一步过滤
  return true
}

/**
 * 检查用户是否有权限查看指定设计方案
 */
export function canViewDesign(design: {
  created_by?: string | null
  order_id?: string | null
  organization_id: string
}, order: {
  assigned_designer?: string | null
  assigned_installer?: string | null
  created_by?: string | null
} | null, user: SessionUser): boolean {
  // 组织隔离
  if (design.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以查看全部
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 设计师：自己创建的，或者订单分配给自己的
  if (user.role === 'designer') {
    if (design.created_by === user.id) return true
    if (order?.assigned_designer === user.id) return true
    return false
  }

  // 销售：只能看与自己订单相关的设计方案
  if (user.role === 'sales') {
    return order?.created_by === user.id
  }

  // 安装人员：只能看与自己订单相关的设计方案
  if (user.role === 'installer') {
    return order?.assigned_installer === user.id
  }

  return false
}

/**
 * 检查用户是否有权限查看指定安装记录
 */
export function canViewInstallation(installation: {
  assigned_to?: string | null
  created_by?: string | null
  order_id?: string | null
  organization_id: string
}, order: {
  assigned_designer?: string | null
  assigned_installer?: string | null
  created_by?: string | null
} | null, user: SessionUser): boolean {
  // 组织隔离
  if (installation.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以查看全部
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 安装人员：只能看自己负责的安装记录
  if (user.role === 'installer') {
    return installation.assigned_to === user.id || order?.assigned_installer === user.id
  }

  // 销售：只能看与自己订单相关的安装记录
  if (user.role === 'sales') {
    return order?.created_by === user.id
  }

  // 设计师：只能看与自己订单相关的安装记录
  if (user.role === 'designer') {
    return order?.assigned_designer === user.id
  }

  return false
}

/**
 * 过滤订单列表，只保留用户有权限查看的订单
 */
export function filterOrdersByRole<T extends {
  created_by?: string | null
  assigned_designer?: string | null
  assigned_installer?: string | null
  organization_id: string
}>(orders: T[], user: SessionUser): T[] {
  return orders.filter(order => canViewOrder(order, user))
}

/**
 * 过滤客户列表，只保留用户有权限查看的客户
 */
export function filterCustomersByRole<T extends {
  created_by?: string | null
  organization_id: string
}>(customers: T[], user: SessionUser): T[] {
  return customers.filter(customer => {
    if (customer.organization_id !== user.organization_id) return false
    if (user.role === 'owner' || user.role === 'manager') return true
    if (user.role === 'sales') {
      return customer.created_by === user.id
    }
    // 设计师和安装人员需要通过订单关联判断，这里先不过滤
    return true
  })
}

/**
 * 过滤设计方案列表，只保留用户有权限查看的方案
 */
export function filterDesignsByRole<T extends {
  created_by?: string | null
  order_id?: string | null
  organization_id: string
  orders?: { created_by?: string | null; assigned_designer?: string | null } | null
}>(designs: T[], user: SessionUser): T[] {
  return designs.filter(design => {
    if (design.organization_id !== user.organization_id) return false
    if (user.role === 'owner' || user.role === 'manager') return true
    if (user.role === 'designer') {
      if (design.created_by === user.id) return true
      if (design.orders?.assigned_designer === user.id) return true
      return false
    }
    if (user.role === 'sales') {
      return design.orders?.created_by === user.id
    }
    if (user.role === 'installer') {
      return false
    }
    return false
  })
}

/**
 * 检查用户是否有权限修改客户基本信息
 * 规则：仅销售、店长和老板可以修改客户基本信息
 */
export function canEditCustomerBasicInfo(customer: {
  created_by?: string | null
  organization_id: string
}, user: SessionUser): boolean {
  // 组织隔离
  if (customer.organization_id !== user.organization_id) {
    return false
  }

  // owner/manager 可以修改全部客户信息
  if (user.role === 'owner' || user.role === 'manager') {
    return true
  }

  // 销售可以修改自己创建的客户信息
  if (user.role === 'sales') {
    return customer.created_by === user.id
  }

  // 设计师和安装人员无权修改客户基本信息
  return false
}

/**
 * 检查用户角色是否有权限查看客户基本信息（所有组织内成员都可以查看）
 */
export function canViewCustomerBasicInfo(user: SessionUser): boolean {
  // 所有已认证用户都可以查看客户基本信息
  return ['owner', 'manager', 'sales', 'designer', 'installer'].includes(user.role)
}

/**
 * 过滤安装记录列表，只保留用户有权限查看的记录
 */
export function filterInstallationsByRole<T extends {
  assigned_to?: string | null
  created_by?: string | null
  order_id?: string | null
  organization_id: string
  orders?: { created_by?: string | null; assigned_designer?: string | null; assigned_installer?: string | null } | null
}>(installations: T[], user: SessionUser): T[] {
  return installations.filter(inst => {
    if (inst.organization_id !== user.organization_id) return false
    if (user.role === 'owner' || user.role === 'manager') return true
    if (user.role === 'installer') {
      return inst.assigned_to === user.id || inst.orders?.assigned_installer === user.id
    }
    if (user.role === 'sales') {
      return inst.orders?.created_by === user.id
    }
    if (user.role === 'designer') {
      return inst.orders?.assigned_designer === user.id
    }
    return false
  })
}
