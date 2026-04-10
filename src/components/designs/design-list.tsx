import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const statusConfig = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-800' },
}

export function DesignList({ designs }: { designs: any[] }) {
  if (designs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无设计方案
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {designs.map((design) => (
        <Link key={design.id} href={`/designs/${design.id}`}>
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{design.title}</h3>
                <p className="text-sm text-muted-foreground">
                  客户：{design.customers?.name || '未知'} {design.customers?.house_type ? `(${design.customers.house_type})` : ''} · {design.total_area ? `${design.total_area}㎡` : ''}
                </p>
              </div>
              <Badge className={statusConfig[design.status as keyof typeof statusConfig]?.color}>
                {statusConfig[design.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}