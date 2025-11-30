'use client'

import { AlertCircle, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface AlertBadgeProps {
  type: 'overdue' | 'due-soon' | 'warning' | 'info' | 'success'
  count: number
  label: string
}

export default function AlertBadge({ type, count, label }: AlertBadgeProps) {
  const config = {
    overdue: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    },
    'due-soon': {
      icon: Clock,
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/30'
    },
    info: {
      icon: AlertCircle,
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30'
    }
  }

  const { icon: Icon, bgColor, textColor, borderColor } = config[type]

  if (count === 0) return null

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${bgColor} ${borderColor}`}>
      <Icon className={`h-4 w-4 ${textColor}`} />
      <span className={`font-medium ${textColor}`}>{count}</span>
      <span className="text-orchestra-cream/70 text-sm">{label}</span>
    </div>
  )
}

