'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FactoryForm } from './factory-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Trash2, Pencil, Plus } from 'lucide-react'

interface Factory {
  id: string
  name: string
  contact_name: string
  contact_phone: string
  address: string
}

interface FactoryListProps {
  initialFactories: Factory[]
  userRole?: string
}

export function FactoryList({ initialFactories, userRole }: FactoryListProps) {
  const [factories, setFactories] = useState<Factory[]>(initialFactories)
  const [showModal, setShowModal] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const canManage = userRole === 'owner' || userRole === 'manager'

  useEffect(() => {
    if (initialFactories.length === 0) {
      fetchFactories()
    }
  }, [])

  const fetchFactories = async () => {
    const { data } = await supabase.from('factories').select('*').order('name')
    setFactories(data || [])
  }

  const handleAdd = () => {
    setEditingFactory(null)
    setShowModal(true)
  }

  const handleEdit = (factory: Factory) => {
    setEditingFactory(factory)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingFactory(null)
  }

  const handleSuccess = async () => {
    setShowModal(false)
    setEditingFactory(null)
    await fetchFactories()
  }

  const handleDelete = async (id: string) => {
    setIsSubmitting(true)
    const { error } = await supabase.from('factories').delete().eq('id', id)

    if (error) {
      alert('删除失败：' + error.message)
    } else {
      await fetchFactories()
    }
    setDeleteConfirmId(null)
    setIsSubmitting(false)
  }

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            添加工厂
          </Button>
        </div>
      )}

      {factories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          暂无工厂{canManage ? '，点击添加' : ''}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {factories.map(factory => (
            <div key={factory.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{factory.name}</h3>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(factory)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(factory.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>联系人：{factory.contact_name || '-'}</p>
                <p>电话：{factory.contact_phone || '-'}</p>
                <p>地址：{factory.address || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFactory ? '编辑工厂' : '添加工厂'}</DialogTitle>
            <DialogDescription>
              {editingFactory ? '修改工厂信息' : '添加新的合作工厂'}
            </DialogDescription>
          </DialogHeader>
          <FactoryForm
            factory={editingFactory}
            onSuccess={handleSuccess}
            onCancel={handleCloseModal}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个工厂吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isSubmitting}
            >
              {isSubmitting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
