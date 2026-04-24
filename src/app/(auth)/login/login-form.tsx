'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Lock, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [mode, setMode] = useState<'email' | 'phone'>('phone')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = mode === 'email'
        ? { email: identifier, password }
        : { phone: `+86${identifier}`, password }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '登录失败')
      }

      // 登录成功后生成新的 session_id，用于通知弹窗控制
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2)
      localStorage.setItem('session_id', sessionId)
      // 清除之前的通知弹窗标记，这样新登录后会重新显示弹窗
      localStorage.removeItem('notification_modal_shown_for_session')

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 模式切换 tabs - Apple style */}
      <div className="flex bg-apple-gray-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setMode('phone')}
          className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 ${
            mode === 'phone'
              ? 'bg-white text-apple-gray-900 shadow-sm'
              : 'text-apple-gray-500 hover:text-apple-gray-900'
          }`}
        >
          手机号
        </button>
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 ${
            mode === 'email'
              ? 'bg-white text-apple-gray-900 shadow-sm'
              : 'text-apple-gray-500 hover:text-apple-gray-900'
          }`}
        >
          邮箱
        </button>
      </div>

      {/* Input fields */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-500">
            {mode === 'email' ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </div>
          <input
            type={mode === 'email' ? 'email' : 'tel'}
            placeholder={mode === 'email' ? '邮箱地址' : '手机号'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-apple-gray-100 border-0 rounded-xl text-[15px] text-apple-gray-900 placeholder-apple-gray-500 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:bg-white transition-all"
            required
          />
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-500">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-apple-gray-100 border-0 rounded-xl text-[15px] text-apple-gray-900 placeholder-apple-gray-500 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:bg-white transition-all"
            required
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-apple-blue text-white text-[15px] font-medium rounded-xl hover:bg-apple-blue-hover active:bg-apple-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  )
}
