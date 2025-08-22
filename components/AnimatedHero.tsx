'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Mail, Phone, Globe, MapPin, Home, Briefcase, FileText, Zap, Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'

const navItems = [
  { label: 'Home', icon: <Home className="h-5 w-5" />, href: '#home' },
  { label: 'Summary', icon: <Briefcase className="h-5 w-5" />, href: '#summary' },
  { label: 'Experience', icon: <FileText className="h-5 w-5" />, href: '#experience' },
  { label: 'Skills', icon: <Zap className="h-5 w-5" />, href: '#skills' },
  { label: 'Links', icon: <LinkIcon className="h-5 w-5" />, href: '#links' }
]

export default function AnimatedHero() {
  const { scrollY } = useScroll()
  
  // Transform scroll position to create the blur and movement effects
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.8])
  const heroY = useTransform(scrollY, [0, 300], [0, -100])
  
  const titleOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const titleY = useTransform(scrollY, [0, 200], [0, -50])
  
  const subtitleOpacity = useTransform(scrollY, [0, 250], [1, 0])
  const subtitleY = useTransform(scrollY, [0, 250], [0, -30])
  
  const contactOpacity = useTransform(scrollY, [0, 280], [1, 0])
  const contactY = useTransform(scrollY, [0, 280], [0, -20])
  
  const backgroundBlur = useTransform(scrollY, [0, 400], [0, 20])

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#222] to-[#333]" />
      
      {/* Profile Image Background - Right Side */}
      <div className="absolute right-0 top-0 w-1/2 h-full overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            filter: `blur(${backgroundBlur.get()}px)`,
          }}
        >
          <Image
            src="https://iruuyetwtjojopjyzwia.supabase.co/storage/v1/object/public/home/pexels-cottonbro-7095812.jpg"
            alt="Profile Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#333] via-transparent to-transparent" />
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
          
          {/* Left Side - Text Content */}
          <motion.div
            className="text-white space-y-8"
            style={{
              opacity: heroOpacity,
              scale: heroScale,
              y: heroY,
            }}
          >
            {/* Top Left - Status */}
            <motion.div
              className="flex items-center gap-3"
              style={{
                opacity: titleOpacity,
                y: titleY,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium text-sm">Active Projects</span>
            </motion.div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Role */}
              <motion.div
                style={{
                  opacity: subtitleOpacity,
                  y: subtitleY,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <h2 className="text-yellow-400 font-bold text-lg tracking-wider uppercase">
                  Community Innovator & Program Builder
                </h2>
              </motion.div>

              {/* Name */}
              <motion.h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight"
                style={{
                  opacity: titleOpacity,
                  y: titleY,
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                Readyaimgo
                <span className="block text-yellow-400">BEAM</span>
              </motion.h1>

              {/* Contact Information */}
              <motion.div
                className="space-y-4"
                style={{
                  opacity: contactOpacity,
                  y: contactY,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                  <Mail className="h-5 w-5 text-yellow-400" />
                  <a href="mailto:hello@readyaimgo.com" className="hover:text-yellow-400 transition-colors">
                    hello@readyaimgo.com
                  </a>
                </div>
                
                <div className="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                  <Phone className="h-5 w-5 text-yellow-400" />
                  <a href="tel:+14045551234" className="hover:text-yellow-500 transition-colors">
                    +1 (404) 555-1234
                  </a>
                </div>
                
                <div className="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                  <Globe className="h-5 w-5 text-yellow-400" />
                  <a href="https://beamthinktank.space" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors">
                    beamthinktank.space
                  </a>
                </div>
                
                <div className="flex items-center gap-3 text-white/90">
                  <MapPin className="h-5 w-5 text-yellow-400" />
                  <span>Atlanta, GA</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Empty for background image */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* Top Right CTA Button */}
      <motion.div
        className="absolute top-8 right-8 z-20"
        style={{
          opacity: titleOpacity,
          y: titleY,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <Link
          href="https://beamthinktank.space"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Explore Programs
        </Link>
      </motion.div>

      {/* Bottom Sticky Navigation */}
      <motion.nav
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="bg-black/80 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-8">
            {navItems.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <div className="p-2 rounded-full group-hover:bg-white/10 transition-colors">
                  {item.icon}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.nav>
    </section>
  )
}
