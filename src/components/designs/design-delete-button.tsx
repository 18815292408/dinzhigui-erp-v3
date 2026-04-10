'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  designId: string
}

export function DesignDeleteButton({ designId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('确定要删除这个方案吗？')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/designs/${designId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        router.push('/designs')
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? '删除中...' : '删除方案'}
    </Button>
  )
}
