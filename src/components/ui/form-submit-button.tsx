'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function FormSubmitButton({ children, className, variant, size }: {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs' | 'icon-lg'
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending ? '处理中...' : children}
    </Button>
  )
}
