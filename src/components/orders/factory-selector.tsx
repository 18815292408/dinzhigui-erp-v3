'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Factory {
  id: string
  name: string
  contact_name: string
  contact_phone: string
}

interface FactoryRecord {
  factory_id: string
  factory_name: string
  contact_name: string
  contact_phone: string
  amount: number
}

interface FactorySelectorProps {
  onChange: (records: FactoryRecord[]) => void
  value: FactoryRecord[]
}

export function FactorySelector({ onChange, value }: FactorySelectorProps) {
  const [factories, setFactories] = useState<Factory[]>([])
  const [selected, setSelected] = useState<FactoryRecord[]>(value)

  useEffect(() => {
    const fetchFactories = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('factories').select('*').order('name')
      setFactories(data || [])
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
    onChange(updated)
  }

  const updateAmount = (index: number, amount: number) => {
    const updated = [...selected]
    updated[index].amount = amount
    setSelected(updated)
    onChange(updated)
  }

  const removeFactory = (index: number) => {
    const updated = selected.filter((_, i) => i !== index)
    setSelected(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {factories
          .filter(f => !selected.find(s => s.factory_id === f.id))
          .map(factory => (
            <button
              key={factory.id}
              onClick={() => addFactory(factory)}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
            >
              + {factory.name}
            </button>
          ))}
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
                  onClick={() => removeFactory(index)}
                  className="text-red-500 text-sm"
                >
                  删除
                </button>
              </div>
              <input
                type="number"
                placeholder="金额"
                value={record.amount || ''}
                onChange={(e) => updateAmount(index, parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
