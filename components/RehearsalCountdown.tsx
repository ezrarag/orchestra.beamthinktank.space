'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Clock, Music, Users, MapPin, Calendar } from 'lucide-react'

interface Rehearsal {
  id: string
  title: string
  date: string
  time: string
  location: string
  currentParticipants: number
  maxParticipants: number
  status: 'upcoming' | 'ongoing' | 'completed'
}

const upcomingRehearsals: Rehearsal[] = [
  {
    id: '1',
    title: 'Winter Concert Rehearsal',
    date: '2024-12-15',
    time: '19:00',
    location: 'Orlando Community Center',
    currentParticipants: 45,
    maxParticipants: 60,
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Chamber Music Workshop',
    date: '2024-12-18',
    time: '18:30',
    location: 'St. James Cathedral',
    currentParticipants: 18,
    maxParticipants: 25,
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'Sectional Rehearsals',
    date: '2024-12-20',
    time: '14:00',
    location: 'Dr. Phillips Center',
    currentParticipants: 52,
    maxParticipants: 60,
    status: 'upcoming'
  }
]

export default function RehearsalCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  
  const { scrollY } = useScroll()
  const sectionOpacity = useTransform(scrollY, [1200, 1600], [0, 1])
  const sectionY = useTransform(scrollY, [1200, 1600], [100, 0])

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const targetDate = new Date('2024-12-15T19:00:00').getTime()
      const difference = targetDate - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      }
    }

    const timer = setInterval(calculateTimeLeft, 1000)
    calculateTimeLeft()

    return () => clearInterval(timer)
  }, [])

  const getStatusColor = (status: Rehearsal['status']) => {
    switch (status) {
      case 'upcoming':
        return 'text-blue-600'
      case 'ongoing':
        return 'text-green-600'
      case 'completed':
        return 'text-gray-600'
      default:
        return 'text-orchestra-brown'
    }
  }

  const getStatusIcon = (status: Rehearsal['status']) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />
      case 'ongoing':
        return <Music className="h-4 w-4" />
      case 'completed':
        return <Calendar className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <motion.section
      id="rehearsals"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        opacity: sectionOpacity,
        y: sectionY,
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-40 h-40 bg-orchestra-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-orchestra-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-serif text-orchestra-dark mb-6">
            Next Rehearsal
          </h2>
          <p className="text-xl text-orchestra-brown/80 max-w-3xl mx-auto">
            Countdown to our next musical gathering
          </p>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds }
            ].map((unit, index) => (
              <motion.div
                key={unit.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="bg-orchestra-gold/20 backdrop-blur-md rounded-2xl p-6 border border-orchestra-gold/30">
                  <motion.div
                    className="text-4xl md:text-5xl font-serif text-orchestra-dark mb-2"
                    key={unit.value}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {unit.value.toString().padStart(2, '0')}
                  </motion.div>
                  <div className="text-sm text-orchestra-brown/70 font-medium">
                    {unit.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Rehearsals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {upcomingRehearsals.map((rehearsal, index) => (
            <motion.div
              key={rehearsal.id}
              className="group"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                y: -10,
                transition: { duration: 0.3 }
              }}
            >
              <div className="card h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(rehearsal.status)}
                    <span className={`text-sm font-medium ${getStatusColor(rehearsal.status)}`}>
                      {rehearsal.status.charAt(0).toUpperCase() + rehearsal.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-xs text-orchestra-brown/60">
                    {new Date(rehearsal.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif text-orchestra-dark mb-3 group-hover:text-orchestra-gold transition-colors duration-300">
                  {rehearsal.title}
                </h3>

                {/* Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-orchestra-brown/70">
                    <Clock className="h-4 w-4" />
                    <span>{rehearsal.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orchestra-brown/70">
                    <MapPin className="h-4 w-4" />
                    <span>{rehearsal.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orchestra-brown/70">
                    <Users className="h-4 w-4" />
                    <span>{rehearsal.currentParticipants}/{rehearsal.maxParticipants}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-orchestra-cream/50 rounded-full h-2 mb-4">
                  <motion.div
                    className="bg-orchestra-gold h-full rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(rehearsal.currentParticipants / rehearsal.maxParticipants) * 100}%` }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  />
                </div>

                {/* CTA Button */}
                <motion.button
                  className="w-full btn-primary text-sm py-2 px-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {rehearsal.currentParticipants >= rehearsal.maxParticipants ? 'Join Waitlist' : 'Sign Up'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-lg text-orchestra-brown/80 mb-8 max-w-2xl mx-auto">
            Ready to join our musical community? Sign up for rehearsals and be part of creating beautiful music together.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <a href="/rehearsals" className="btn-primary text-lg px-8 py-4">
              View All Rehearsals
            </a>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  )
}
