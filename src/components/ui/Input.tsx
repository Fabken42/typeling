'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-base text-fg placeholder:text-faint sm:text-sm',
      'focus:outline-none focus:ring-2 focus:ring-emerald-500/60',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-base text-fg placeholder:text-faint sm:text-sm',
      'focus:outline-none focus:ring-2 focus:ring-emerald-500/60',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-1.5 block text-sm font-medium text-fg', className)}
    >
      {children}
    </label>
  )
}
