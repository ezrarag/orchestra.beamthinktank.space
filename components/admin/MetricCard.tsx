'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  onClick?: () => void
  className?: string
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  onClick,
  className = ''
}: MetricCardProps) {
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <motion.div
      className={`
        bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border 
        ${isDev ? 'border-orchestra-gold/40 ring-2 ring-yellow-400/20' : 'border-orchestra-gold/20'} 
        p-6 hover:border-orchestra-gold/40 transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-orchestra-cream/70 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold text-orchestra-gold">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm text-green-400">
              <span>{trend.value}% {trend.label}</span>
            </div>
          )}
          {onClick && (
            <p className="text-xs text-orchestra-cream/50 mt-2">Click to view details</p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-orchestra-gold/20`}>
          <Icon className="h-6 w-6 text-orchestra-gold" />
        </div>
      </div>
    </motion.div>
  )
}





