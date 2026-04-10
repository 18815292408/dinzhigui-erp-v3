'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type TimeRange = 'today' | 'week' | 'month' | 'all'

export function TimeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get('range') as TimeRange) || 'all'

  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'all', label: '全部' },
  ]

  const handleChange = (value: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('range')
    } else {
      params.set('range', value)
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex bg-apple-gray-100 rounded-xl p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => handleChange(range.value)}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
            current === range.value
              ? 'bg-white text-apple-gray-900 shadow-sm'
              : 'text-apple-gray-500 hover:text-apple-gray-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
