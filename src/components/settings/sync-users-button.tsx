'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SyncUsersButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleSync = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/sync-users', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        const msg = `同步完成：已同步 ${data.synced} 个`
        if (data.skipped > 0) {
          setResult(`${msg}，跳过 ${data.skipped} 个（属其他门店）`)
        } else {
          setResult(msg)
        }
        router.refresh()
      } else {
        setResult(`同步失败：${data.error}`)
      }
    } catch (err: any) {
      setResult(`同步失败：${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSync} disabled={loading} variant="outline">
        {loading ? '同步中...' : '同步账号'}
      </Button>
      {result && (
        <p className="text-sm text-muted-foreground">{result}</p>
      )}
    </div>
  )
}
