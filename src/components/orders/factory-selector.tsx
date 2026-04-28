'use client'

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { wanToYuan, yuanToWan } from '@/lib/format-amount'

interface Factory {
  id: string
  name: string
  contact_name: string
  contact_phone: string
}

export interface FactoryRecord {
  factory_id: string
  factory_name: string
  contact_name: string
  contact_phone: string
  amount: number
}

export interface FactorySelectorHandle {
  getSelected: () => FactoryRecord[]
}

interface FactorySelectorProps {
  /** 初始值 */
  value: FactoryRecord[]
  /** 选中工厂后回调（仅更新内部状态，不自动提交） */
  onChange?: (selected: FactoryRecord[]) => void
  /** 是否显示"确认下单"按钮 */
  showConfirm?: boolean
  /** 点击确认下单按钮的回调 */
  onConfirm?: (selected: FactoryRecord[]) => void
  /** 确认按钮文字 */
  confirmText?: string
}

export const FactorySelector = forwardRef<FactorySelectorHandle, FactorySelectorProps>(function FactorySelector({
  value,
  onChange,
  showConfirm = false,
  onConfirm,
  confirmText = '确认下单',
}, ref) {
  // 数据库存元，界面用万元编辑和显示
  function toWanRecords(records: FactoryRecord[]): FactoryRecord[] {
    return records.map(r => ({ ...r, amount: parseFloat(yuanToWan(r.amount)) || 0 }))
  }
  function toYuanRecords(records: FactoryRecord[]): FactoryRecord[] {
    return records.map(r => ({ ...r, amount: wanToYuan(r.amount) ?? 0 }))
  }
  const initialInWan = toWanRecords(value)
  const [factories, setFactories] = useState<Factory[]>([])
  const [selected, setSelected] = useState<FactoryRecord[]>(initialInWan)

  useImperativeHandle(ref, () => ({
    getSelected: () => toYuanRecords(selected)
  }))

  useEffect(() => {
    const fetchFactories = async () => {
      const res = await fetch('/api/factories', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFactories(data || [])
      }
    }
    fetchFactories()
  }, [])

  const addFactory = (factory: Factory) => {
    const newRecord: FactoryRecord = {
      factory_id: factory.id,
      factory_name: factory.name,
      contact_name: factory.contact_name,
      contact_phone: factory.contact_phone,
      amount: 0
    }
    const updated = [...selected, newRecord]
    setSelected(updated)
    onChange?.(toYuanRecords(updated))
  }

  const updateAmount = (index: number, amount: number) => {
    const updated = [...selected]
    updated[index].amount = amount
    setSelected(updated)
    onChange?.(toYuanRecords(updated))
  }

  const removeFactory = (index: number) => {
    const updated = selected.filter((_, i) => i !== index)
    setSelected(updated)
    onChange?.(toYuanRecords(updated))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {factories
          .filter(f => !selected.find(s => s.factory_id === f.id))
          .map(factory => (
            <button
              key={factory.id}
              type="button"
              onClick={() => addFactory(factory)}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
            >
              + {factory.name}
            </button>
          ))}
        {factories.length === 0 && (
          <p className="text-sm text-gray-400">暂无可选工厂</p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">已选工厂</h4>
          {selected.map((record, index) => (
            <div key={record.factory_id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium">{record.factory_name}</div>
                  <div className="text-sm text-gray-500">
                    {record.contact_name} · {record.contact_phone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFactory(index)}
                  className="text-red-500 text-sm"
                >
                  删除
                </button>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="金额（万）"
                  value={record.amount || ''}
                  onChange={(e) => updateAmount(index, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">万</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfirm && selected.length > 0 && (
        <button
          type="button"
          onClick={() => onConfirm?.(toYuanRecords(selected))}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {confirmText}
        </button>
      )}
    </div>
  )
})
