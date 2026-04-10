'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

export function DesignNotice() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const noticeParam = searchParams.get('notice')
    const customer = searchParams.get('customer')

    if (noticeParam === 'design_created' && customer) {
      setNotice(`已为客户"${decodeURIComponent(customer)}"创建设计方案，请设计师完善`)
      setVisible(true)

      // 3秒后自动隐藏
      const timer = setTimeout(() => {
        setVisible(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!visible) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600" />
      <p className="text-sm text-green-800">{notice}</p>
    </div>
  )
}
