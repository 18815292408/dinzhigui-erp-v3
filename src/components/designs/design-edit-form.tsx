'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, X, Check } from 'lucide-react'

interface Design {
  id: string
  title: string | null
  room_count: number | null
  total_area: number | null
  description: string | null
  final_price: number | null
  status: string
  cad_file: string | null
  cad_file_url: string | null
  kujiale_link: string | null
  signed_amount?: number | null
}

interface Props {
  design: Design
  onSaved?: () => void
}

export function DesignEditForm({ design, onSaved }: Props) {
  const [form, setForm] = useState({
    title: design.title || '',
    room_count: design.room_count?.toString() || '',
    total_area: design.total_area?.toString() || '',
    final_price: design.final_price?.toString() || '',
    description: design.description || '',
    kujiale_link: design.kujiale_link || '',
    cad_file: design.cad_file || '',
    cad_file_url: design.cad_file_url || '',
  })

  // 如果有订单签单金额，显示只读值而不是输入框
  const hasSignedAmount = design.signed_amount != null
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '上传失败')
      }

      const { url, filename } = await res.json()
      setForm(prev => ({
        ...prev,
        cad_file: filename,
        cad_file_url: url,
      }))
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/designs/${design.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title || null,
          room_count: form.room_count ? parseInt(form.room_count) : null,
          total_area: form.total_area ? parseFloat(form.total_area) : null,
          price: form.final_price ? parseFloat(form.final_price) : null,
          description: form.description || null,
          kujiale_link: form.kujiale_link || null,
          cad_file: form.cad_file || null,
          cad_file_url: form.cad_file_url || null,
        }),
      })

      if (!res.ok) {
        throw new Error('保存失败')
      }

      setSuccess(true)
      router.refresh()
      onSaved?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-600">保存成功</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

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
        {hasSignedAmount ? (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-green-600 font-medium">¥{design.signed_amount}万（来自订单签单金额）</p>
          </div>
        ) : (
          <Input
            type="number"
            value={form.final_price}
            onChange={(e) => setForm({ ...form, final_price: e.target.value })}
            placeholder="请在客户管理填写签单金额"
          />
        )}
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
          value={form.kujiale_link}
          onChange={(e) => setForm({ ...form, kujiale_link: e.target.value })}
          placeholder="https://yun.kujiale.com/design/..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">CAD文件</label>
        {form.cad_file_url ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-sm">{form.cad_file}</span>
            <a
              href={form.cad_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              下载
            </a>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, cad_file: '', cad_file_url: '' }))}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {uploading ? '上传中...' : '点击上传 CAD 文件'}
            </span>
            <input
              type="file"
              accept=".dwg,.dxf,.pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
        <p className="text-xs text-gray-400">支持 .dwg, .dxf, .pdf, .jpg, .png 格式，最大 50MB</p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading || uploading}>
          {loading ? '保存中...' : '保存方案'}
        </Button>
      </div>
    </form>
  )
}
