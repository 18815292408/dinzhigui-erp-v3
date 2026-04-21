'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FactoryForm } from './factory-form'

interface Factory {
  id: string
  name: string
  contact_name: string
  contact_phone: string
  address: string
}

export function FactoryList() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Factory | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchFactories()
  }, [])

  const fetchFactories = async () => {
    const { data } = await supabase.from('factories').select('*').order('name')
    setFactories(data || [])
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return
    await supabase.from('factories').delete().eq('id', id)
    fetchFactories()
  }

  const handleSuccess = () => {
    setShowForm(false)
    setEditing(null)
    fetchFactories()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">工厂管理</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          添加工厂
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <FactoryForm
            factory={editing}
            onSuccess={handleSuccess}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {factories.map(factory => (
          <div key={factory.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{factory.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(factory); setShowForm(true); }}
                  className="text-blue-500 text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(factory.id)}
                  className="text-red-500 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>联系人：{factory.contact_name}</p>
              <p>电话：{factory.contact_phone}</p>
              <p>地址：{factory.address}</p>
            </div>
          </div>
        ))}
      </div>

      {factories.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">暂无工厂，点击添加</div>
      )}
    </div>
  )
}
