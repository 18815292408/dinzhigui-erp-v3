'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const statusConfig = {
  pending: { label: '待安装', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
}

export function InstallationList({ installations }: { installations: any[] }) {
  if (installations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无安装单
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {installations.map((inst) => (
        <Link key={inst.id} href={`/installations/${inst.id}`}>
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{inst.customers?.name || '未知客户'}</h3>
                <p className="text-sm text-muted-foreground">
                  方案：{inst.designs?.title || '无'}
                  {inst.designs?.final_price && ` · ¥${inst.designs.final_price.toLocaleString()}`}
                  {inst.designs?.room_count && ` · ${inst.designs.room_count}室`}
                  {inst.customers?.house_type && ` (${inst.customers.house_type})`}
                </p>
                <p className="text-sm text-muted-foreground">
                  联系方式：{inst.customers?.phone || '无'}
                </p>
              </div>
              <Badge className={statusConfig[inst.status as keyof typeof statusConfig]?.color}>
                {statusConfig[inst.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}