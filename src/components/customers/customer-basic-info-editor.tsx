'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CustomerBasicInfo {
  id: string
  name: string
  phone: string | null
  house_type: string | null
  address: string | null
  estimated_price: number | null
  requirements: string | null
}

interface CustomerBasicInfoEditorProps {
  customer: CustomerBasicInfo
  onSave: (updatedCustomer: CustomerBasicInfo) => Promise<void>
  onCancel: () => void
}

export function CustomerBasicInfoEditor({ customer, onSave, onCancel }: CustomerBasicInfoEditorProps) {
  const [formData, setFormData] = useState<Partial<CustomerBasicInfo>>({
    name: customer.name,
    phone: customer.phone || '',
    house_type: customer.house_type || '',
    address: customer.address || '',
    estimated_price: customer.estimated_price,
    requirements: customer.requirements || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name || !formData.name.trim()) {
      errors.name = '客户姓名不能为空'
    }

    if (formData.phone && formData.phone !== '') {
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = '电话号码格式不正确，请输入11位手机号'
      }
    }

    if (formData.estimated_price !== undefined && formData.estimated_price !== null) {
      const price = parseFloat(String(formData.estimated_price))
      if (isNaN(price) || price < 0) {
        errors.estimated_price = '预估价格必须是非负数'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  const handleChange = useCallback((field: keyof CustomerBasicInfo, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }, [fieldErrors])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      const updatedCustomer: CustomerBasicInfo = {
        ...customer,
        name: formData.name?.trim() || customer.name,
        phone: formData.phone || null,
        house_type: formData.house_type || null,
        address: formData.address || null,
        estimated_price: formData.estimated_price !== undefined && formData.estimated_price !== null
          ? parseFloat(String(formData.estimated_price))
          : null,
        requirements: formData.requirements || null,
      }
      await onSave(updatedCustomer)
    } catch (err: any) {
      setError(err.message || '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }, [formData, customer, onSave, validateForm])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            客户姓名 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="请输入客户姓名"
            disabled={saving}
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-500">{fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">联系电话</label>
          <Input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="请输入11位手机号"
            disabled={saving}
            aria-invalid={!!fieldErrors.phone}
          />
          {fieldErrors.phone && (
            <p className="text-xs text-red-500">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">房型</label>
          <Input
            type="text"
            value={formData.house_type || ''}
            onChange={(e) => handleChange('house_type', e.target.value)}
            placeholder="如：三室两厅、两室一厅等"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">地址</label>
          <Input
            type="text"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="请输入客户地址"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">预估价格（元）</label>
          <Input
            type="number"
            value={formData.estimated_price !== null && formData.estimated_price !== undefined ? formData.estimated_price : ''}
            onChange={(e) => handleChange('estimated_price', e.target.value === '' ? null : e.target.value)}
            placeholder="请输入预估价格"
            disabled={saving}
            min={0}
            step={0.01}
            aria-invalid={!!fieldErrors.estimated_price}
          />
          {fieldErrors.estimated_price && (
            <p className="text-xs text-red-500">{fieldErrors.estimated_price}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">需求描述</label>
        <Textarea
          value={formData.requirements || ''}
          onChange={(e) => handleChange('requirements', e.target.value)}
          placeholder="请输入客户需求描述"
          disabled={saving}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  )
}
