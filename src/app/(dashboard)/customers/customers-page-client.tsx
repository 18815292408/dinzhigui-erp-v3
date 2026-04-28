'use client'

import { useState } from 'react'
import { CustomerList } from '@/components/customers/customer-list'
import { OrderFollowupList } from '@/components/customers/order-followup-list'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Customer {
  id: string
  name: string
  phone: string
  house_type: string | null
  orders?: Array<{
    id: string
    order_no: string
    status: string
    signed_amount: number | null
  }>
  intention: string
  created_at: string
  [key: string]: unknown
}

interface CustomersData {
  withoutOrders: Customer[]
  withOrders: Customer[]
}

export function CustomersPageClient({ customers }: { customers: CustomersData }) {
  const [tab, setTab] = useState<'create' | 'followup'>('create')

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'create' | 'followup')}>
        <TabsList>
          <TabsTrigger value="create">订单创建</TabsTrigger>
          <TabsTrigger value="followup">
            订单跟进
            {customers.withOrders.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{customers.withOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'create' ? (
        <CustomerList customers={customers.withoutOrders} />
      ) : (
        <OrderFollowupList customers={customers.withOrders} />
      )}
    </>
  )
}
