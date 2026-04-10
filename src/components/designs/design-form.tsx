'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Customer {
  id: string
  name: string
}

export function DesignForm() {
  const searchParams = useSearchParams()
  const preselectedCustomerId = searchParams.get('customer_id')

  const [form, setForm] = useState({
    customer_id: preselectedCustomerId || '',
    title: '',
    room_count: '',
    total_area: '',
    description: '',
    final_price: '',
    kujiale_link: '',
    cad_file: '',
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Fetch customers from API
    fetch('/api/customers', { credentials: 'include' })
      .then(res => res.ok ? res.json() : { data: [] })
      .then(({ data }) => {
        setCustomers(data || [])
        // 如果有预填的客户 ID，确保它被选中
        if (preselectedCustomerId && data && data.length > 0) {
          setForm(prev => ({ ...prev, customer_id: preselectedCustomerId }))
        }
      })
      .catch(() => setCustomers([]))
  }, [preselectedCustomerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          room_count: parseInt(form.room_count) || null,
          total_area: parseFloat(form.total_area) || null,
          price: parseFloat(form.final_price) || null,
          kujiale_link: form.kujiale_link || null,
          cad_file: form.cad_file || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '创建方案失败')
      }

      router.push('/designs')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '创建方案失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Error display */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-2">
        <label className="text-sm font-medium">关联客户 *</label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={form.customer_id}
          onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          required
        >
          <option value="">选择客户</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">方案名称 *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="如：XX小区A户型设计方案"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">房间数量</label>
          <Input
            type="number"
            value={form.room_count}
            onChange={(e) => setForm({ ...form, room_count: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">总面积（㎡）</label>
          <Input
            type="number"
            step="0.01"
            value={form.total_area}
            onChange={(e) => setForm({ ...form, total_area: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">成交价（元）</label>
        <Input
          type="number"
          value={form.final_price}
          onChange={(e) => setForm({ ...form, final_price: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">方案描述</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md min-h-[120px]"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="详细描述设计方案..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">酷家乐链接</label>
        <Input
          type="url"
          value={form.kujiale_link || ''}
          onChange={(e) => setForm({ ...form, kujiale_link: e.target.value })}
          placeholder="https://yun.kujiale.com/design/..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">CAD文件</label>
        <Input
          type="text"
          value={form.cad_file || ''}
          onChange={(e) => setForm({ ...form, cad_file: e.target.value })}
          placeholder="CAD文件名称或路径"
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存方案'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
