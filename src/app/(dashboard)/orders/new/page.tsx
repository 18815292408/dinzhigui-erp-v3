'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    house_type: '',
    house_area: ''
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('orders').insert({
      ...form,
      house_area: form.house_area ? parseFloat(form.house_area) : null
    })

    setLoading(false)
    if (!error) {
      router.push('/orders')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建订单</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">客户姓名 *</label>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">联系电话</label>
          <input
            type="text"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">地址</label>
          <input
            type="text"
            value={form.customer_address}
            onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">户型</label>
            <input
              type="text"
              value={form.house_type}
              onChange={(e) => setForm({ ...form, house_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="例如：三室两厅"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">面积（㎡）</label>
            <input
              type="number"
              value={form.house_area}
              onChange={(e) => setForm({ ...form, house_area: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '创建中...' : '创建订单'}
          </button>
        </div>
      </form>
    </div>
  )
}
