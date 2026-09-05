'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: ToggleProps) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
        checked ? 'bg-emerald-600' : 'bg-surface-2 border border-border',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )

  if (!label) return control

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-fg">{label}</span>
        {description && (
          <span className="mt-0.5 text-xs text-muted">{description}</span>
        )}
      </span>
      {control}
    </label>
  )
}
