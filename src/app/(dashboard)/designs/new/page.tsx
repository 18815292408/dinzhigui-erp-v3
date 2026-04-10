import { DesignForm } from '@/components/designs/design-form'
import { BackButton } from '@/components/ui/back-button'

export default function NewDesignPage() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/designs" label="返回方案列表" />
        <h1 className="text-2xl font-semibold mt-2">新建方案</h1>
        <p className="text-muted-foreground">创建设计方案</p>
      </div>
      <DesignForm />
    </div>
  )
}