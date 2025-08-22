'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Target, TrendingUp, Award } from 'lucide-react'

interface ProgressBarProps {
  title: string
  current: number
  goal: number
  icon?: React.ReactNode
  color?: string
  className?: string
}

export default function ProgressBar({ 
  title, 
  current, 
  goal, 
  icon = <Target className="h-5 w-5" />,
  color = "orchestra-gold",
  className = ""
}: ProgressBarProps) {
  const { scrollY } = useScroll()
  
  const progress = (current / goal) * 100
  const progressOpacity = useTransform(scrollY, [0, 300], [0, 1])
  const progressScale = useTransform(scrollY, [0, 300], [0, 1])

  return (
    <motion.div 
      className={`card ${className}`}
      style={{
        opacity: progressOpacity,
        scale: progressScale,
      }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-${color} bg-${color}/20 p-2 rounded-full`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-serif text-orchestra-dark">{title}</h3>
          <p className="text-sm text-orchestra-brown/70">
            ${current.toLocaleString()} of ${goal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-orchestra-cream/50 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`bg-${color} h-full rounded-full relative`}
          initial={{ width: 0 }}
          whileInView={{ width: `${progress}%` }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ 
            duration: 1.5, 
            delay: 0.3,
            ease: "easeOut"
          }}
        >
          {/* Progress Shine Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: '-100%' }}
            whileInView={{ x: '100%' }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ 
              duration: 2, 
              delay: 1,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>

      {/* Progress Percentage */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-orchestra-brown/70">
          {progress.toFixed(1)}% Complete
        </span>
        <span className="text-sm font-medium text-orchestra-dark">
          ${(goal - current).toLocaleString()} to go
        </span>
      </div>

      {/* Milestone Indicators */}
      {progress >= 25 && (
        <motion.div
          className="flex items-center gap-2 mt-3 text-sm text-orchestra-gold"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Award className="h-4 w-4" />
          <span>25% Milestone Reached!</span>
        </motion.div>
      )}
      
      {progress >= 50 && (
        <motion.div
          className="flex items-center gap-2 mt-3 text-sm text-orchestra-gold"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Halfway there! Amazing progress!</span>
        </motion.div>
      )}
      
      {progress >= 75 && (
        <motion.div
          className="flex items-center gap-2 mt-3 text-sm text-orchestra-gold"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <Target className="h-4 w-4" />
          <span>Almost there! Final push!</span>
        </motion.div>
      )}
      
      {progress >= 100 && (
        <motion.div
          className="flex items-center gap-2 mt-3 text-sm text-green-600"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <Award className="h-4 w-4" />
          <span>Goal Achieved! Congratulations!</span>
        </motion.div>
      )}
    </motion.div>
  )
}
