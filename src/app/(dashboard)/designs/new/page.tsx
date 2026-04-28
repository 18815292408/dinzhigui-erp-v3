import { redirect } from 'next/navigation'

// 设计方案不再支持自由创建，必须从订单流程进入
// 重定向到订单列表
export default function NewDesignPage() {
  redirect('/orders')
}
