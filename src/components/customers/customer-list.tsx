'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { IntentionBadge } from './intention-badge'

export function CustomerList({ customers }: { customers: any[] }) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无客户数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`}>
          <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {customer.phone} · {customer.house_type || '未填写房型'}
                </p>
              </div>
              <IntentionBadge level={customer.intention_level} />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
