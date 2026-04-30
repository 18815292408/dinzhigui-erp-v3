'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, PackageCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeFactoryRecords, type FactoryShipmentRecord } from '@/lib/factory-shipment'
import { formatMoney } from '@/lib/format-amount'

interface PerFactoryShipmentCardProps {
  orderId: string
  factoryRecords: unknown
  canEdit: boolean
  showActions?: boolean
  onChange?: () => void
}

type LoadingState = {
  factoryId: string
  action: 'shipment' | 'arrival'
} | null

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function getFactoryKey(record: FactoryShipmentRecord, index: number) {
  return record.factory_id || `factory-${index}`
}

export function PerFactoryShipmentCard({
  orderId,
  factoryRecords,
  canEdit,
  showActions = true,
  onChange,
}: PerFactoryShipmentCardProps) {
  const router = useRouter()
  const records = useMemo(() => normalizeFactoryRecords(factoryRecords), [factoryRecords])
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<LoadingState>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    if (onChange) {
      onChange()
      return
    }
    router.refresh()
  }

  const handleSetShipment = async (record: FactoryShipmentRecord, index: number) => {
    const key = getFactoryKey(record, index)
    const selectedDate = draftDates[key] || record.shipment_date

    if (!selectedDate) {
      setError('请选择预计出货日期')
      return
    }

    setLoading({ factoryId: key, action: 'shipment' })
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/set-shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          factory_id: record.factory_id,
          shipment_date: selectedDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '设置出货日期失败')
      refresh()
    } catch (err: any) {
      setError(err.message || '设置出货日期失败')
    } finally {
      setLoading(null)
    }
  }

  const handleConfirmArrival = async (record: FactoryShipmentRecord, index: number) => {
    const key = getFactoryKey(record, index)

    setLoading({ factoryId: key, action: 'arrival' })
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-factory-arrival`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ factory_id: record.factory_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '确认到货失败')
      refresh()
    } catch (err: any) {
      setError(err.message || '确认到货失败')
    } finally {
      setLoading(null)
    }
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-muted-foreground">
        暂无工厂出货记录
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record, index) => {
        const key = getFactoryKey(record, index)
        const shipmentDate = formatDate(record.shipment_date)
        const arrivalDate = formatDate(record.arrival_date)
        const canManage = showActions && canEdit
        const isShipmentLoading = loading?.factoryId === key && loading.action === 'shipment'
        const isArrivalLoading = loading?.factoryId === key && loading.action === 'arrival'

        return (
          <div key={key} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {record.factory_name || `工厂 ${index + 1}`}
                </h4>
                <p className="text-sm text-muted-foreground">
                  金额：{formatMoney(typeof record.amount === 'number' ? record.amount : null)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {arrivalDate ? '已到货' : shipmentDate ? '待到货' : '待出货'}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">预计出货日期</div>
                {canManage ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="date"
                      value={draftDates[key] ?? shipmentDate ?? ''}
                      onChange={(event) => setDraftDates((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))}
                      disabled={Boolean(loading)}
                    />
                    <Button
                      type="button"
                      onClick={() => handleSetShipment(record, index)}
                      disabled={Boolean(loading)}
                      className="sm:w-auto"
                    >
                      <CalendarCheck />
                      {isShipmentLoading ? '提交中' : shipmentDate ? '更新出货时间' : '确认出货时间'}
                    </Button>
                  </div>
                ) : shipmentDate ? (
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    {shipmentDate}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-muted-foreground">
                    待设置
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">到货状态</div>
                {arrivalDate ? (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    {arrivalDate}
                  </div>
                ) : !showActions ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-muted-foreground">
                    未到货
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleConfirmArrival(record, index)}
                    disabled={!canManage || !shipmentDate || Boolean(loading)}
                  >
                    <PackageCheck />
                    {isArrivalLoading ? '提交中' : '确认到货'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {showActions && !canEdit && (
        <p className="text-sm text-muted-foreground">当前账号无权修改工厂出货与到货状态</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
