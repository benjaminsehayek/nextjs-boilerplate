'use client'

import React from 'react'
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react'

const variants = {
  info: {
    border: 'border-l-4 border-info',
    bg: 'bg-info/10',
    icon: Info,
    iconClass: 'text-info',
  },
  success: {
    border: 'border-l-4 border-success',
    bg: 'bg-success/10',
    icon: CheckCircle,
    iconClass: 'text-success',
  },
  warning: {
    border: 'border-l-4 border-ember-500',
    bg: 'bg-ember-500/10',
    icon: AlertTriangle,
    iconClass: 'text-ember-500',
  },
  danger: {
    border: 'border-l-4 border-danger',
    bg: 'bg-danger/10',
    icon: AlertCircle,
    iconClass: 'text-danger',
  },
} as const

export type AlertVariant = keyof typeof variants

interface AlertProps {
  variant: AlertVariant
  title: string
  description?: string
  /** Render additional action elements (e.g. a link or button) below the description */
  action?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function Alert({
  variant,
  title,
  description,
  action,
  dismissible,
  onDismiss,
  className = '',
}: AlertProps) {
  const { border, bg, icon: Icon, iconClass } = variants[variant]

  return (
    <div className={`flex items-start gap-3 p-4 rounded-card ${border} ${bg} ${className}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ash-200">{title}</p>
        {description && (
          <p className="text-sm text-ash-400 mt-0.5">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-ash-400 hover:text-ash-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
