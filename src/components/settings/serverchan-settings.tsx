'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ServerChanSettings() {
  const [sendkey, setSendkey] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me/serverchan')
      .then((res) => res.json())
      .then((data) => {
        if (data.sendkey) {
          setSendkey(data.sendkey)
        }
      })
      .catch((err) => console.error('Failed to load sendkey:', err))
  }, [])

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    setError('')

    try {
      const res = await fetch('/api/users/me/serverchan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendkey: sendkey.trim() || null }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '保存失败')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    if (!sendkey.trim()) {
      setError('请先填写 SendKey')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/me/serverchan/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendkey: sendkey.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '测试推送失败')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base lg:text-lg">微信消息推送</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 bg-blue-50 text-sm space-y-2">
          <p className="font-medium text-blue-900">配置步骤：</p>
          <ol className="text-blue-800 space-y-1 list-decimal list-inside text-xs">
            <li>
              访问{' '}
              <a
                href="https://sct.ftqq.com/sendkey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline font-medium"
              >
                Server酱官网
              </a>
            </li>
            <li>用微信扫码登录（扫码时会自动要求关注公众号）</li>
            <li>
              在「SendKey」页面复制你的 Key（格式如{' '}
              <code className="bg-blue-100 px-1 rounded">SCTxxx...</code>）
            </li>
            <li>将 Key 填入下方输入框，点击保存</li>
            <li>点击「测试推送」，确认微信能收到消息</li>
          </ol>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">SendKey</label>
          <Input
            value={sendkey}
            onChange={(e) => setSendkey(e.target.value)}
            placeholder="SCTxxxxxxxxxxxxxxxx"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            你的 SendKey 是私密信息，仅用于向你个人微信推送消息，我们不会泄露给第三方。
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">操作成功，请检查微信</p>}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? '保存中...' : '保存'}
          </Button>
          <Button
            onClick={handleTest}
            disabled={loading || !sendkey.trim()}
            variant="outline"
            className="w-full sm:w-auto"
          >
            测试推送
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
