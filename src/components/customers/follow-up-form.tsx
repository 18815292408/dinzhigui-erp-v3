'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function FollowUpForm({ customerId }: { customerId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current customer data first
      const res = await fetch(`/api/customers?id=${customerId}`, { credentials: 'include' })
      const { data } = await res.json()
      const customer = data?.[0]

      const existingFollowUps = typeof customer?.follow_ups === 'string'
        ? JSON.parse(customer.follow_ups || '[]')
        : (customer?.follow_ups || [])

      const newFollowUp = {
        content,
        date: new Date().toISOString(),
      }

      // Update customer with new follow-up
      await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          follow_ups: JSON.stringify([...existingFollowUps, newFollowUp]),
        }),
      })

      setContent('')
      router.refresh()
    } catch (err) {
      console.error('Failed to add follow-up:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="添加跟进记录..."
        required
      />
      <Button type="submit" disabled={loading || !content}>
        {loading ? '添加中...' : '添加跟进'}
      </Button>
    </form>
  )
}
