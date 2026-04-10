'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CustomerForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    house_type: '',
    requirements: '',
    estimated_price: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '创建客户失败')
      }

      const { data: customer } = await res.json()
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (err: any) {
      console.error('Error creating customer:', err)
      setError(err.message || '创建客户失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">客户姓名 *</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">联系电话 *</label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">邮箱</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">房型</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={form.house_type}
            onChange={(e) => setForm({ ...form, house_type: e.target.value })}
          >
            <option value="">请选择</option>
            <option value="一室一厅">一室一厅</option>
            <option value="两室一厅">两室一厅</option>
            <option value="三室两厅">三室两厅</option>
            <option value="四室两厅">四室两厅</option>
            <option value="复式">复式</option>
            <option value="别墅">别墅</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">地址</label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">预估价格（元）</label>
        <Input
          type="number"
          value={form.estimated_price}
          onChange={(e) => setForm({ ...form, estimated_price: e.target.value })}
          placeholder="导购初步算价"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">需求描述 *</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md min-h-[120px]"
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          placeholder="请描述客户的需求：风格偏好、预算、特殊要求等"
          required
        />
      </div>

      <div className="flex gap-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存客户'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
