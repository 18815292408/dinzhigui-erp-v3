'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Factory {
  id?: string
  name: string
  contact_name: string
  contact_phone: string
  address: string
}

interface FactoryFormProps {
  factory?: Factory | null
  onSuccess: () => void
  onCancel: () => void
}

export function FactoryForm({ factory, onSuccess, onCancel }: FactoryFormProps) {
  const [form, setForm] = useState<Factory>({
    name: factory?.name || '',
    contact_name: factory?.contact_name || '',
    contact_phone: factory?.contact_phone || '',
    address: factory?.address || ''
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (factory?.id) {
      await supabase.from('factories').update(form).eq('id', factory.id)
    } else {
      await supabase.from('factories').insert(form)
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">工厂名称</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="例如：A厂"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">联系人</label>
        <input
          type="text"
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">联系电话</label>
        <input
          type="text"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">地址</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg">
          取消
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
