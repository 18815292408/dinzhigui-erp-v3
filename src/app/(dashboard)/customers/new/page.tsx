import { CustomerForm } from '@/components/customers/customer-form'
import { BackButton } from '@/components/ui/back-button'

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/customers" label="返回客户列表" />
        <h1 className="text-2xl font-semibold mt-2">新建客户</h1>
        <p className="text-muted-foreground">录入客户基本信息</p>
      </div>
      <CustomerForm />
    </div>
  )
}
