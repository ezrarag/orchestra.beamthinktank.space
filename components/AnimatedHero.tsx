'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Mail, Phone, Globe, MapPin, ChevronDown, Music, Calendar, Users, GraduationCap, Heart, DollarSign } from 'lucide-react'
import Image from 'next/image'
import UserMenu from './UserMenu'

const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

const navigationItems = [
  { label: 'Performances', href: '/performances', icon: Music },
  { label: 'Rehearsals', href: '/rehearsals', icon: Calendar },
  { label: 'Training Modules', href: '/modules', icon: GraduationCap },
  { label: 'Cities', href: '/cities', icon: MapPin },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Donate', href: '/donate', icon: Heart },
  { label: 'Scholarship', href: '/scholarship', icon: DollarSign },
]

export default function AnimatedHero() {
  const { scrollY } = useScroll()
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const exploreDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target as Node)) {
        setIsExploreDropdownOpen(false)
      }
    }

    if (isCityDropdownOpen || isExploreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCityDropdownOpen, isExploreDropdownOpen])
  
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
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
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
            {/* Top Left - Status and City Selector */}
            <motion.div
              className="flex items-center justify-between"
              style={{
                opacity: titleOpacity,
                y: titleY,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 font-medium text-sm">Active Projects</span>
              </div>

              {/* City Selector Dropdown */}
              <div className="relative" ref={cityDropdownRef}>
                <button
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-colors text-white"
                >
                  <MapPin className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium">{selectedCity}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCityDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 right-0 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-xl z-50 min-w-[160px]"
                  >
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city)
                          setIsCityDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedCity === city
                            ? 'bg-yellow-400/20 text-yellow-400'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
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
                
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Empty for background image */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* Top Right - User Menu and Explore Programs Dropdown */}
      <motion.div
        className="absolute top-8 right-8 z-20 flex items-center space-x-4"
        style={{
          opacity: titleOpacity,
          y: titleY,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        {/* User Menu */}
        <UserMenu />

        {/* Explore Programs Dropdown */}
        <div className="relative" ref={exploreDropdownRef}>
          <button
            onClick={() => setIsExploreDropdownOpen(!isExploreDropdownOpen)}
            className="inline-flex items-center px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg space-x-2"
          >
            <span>Explore Programs</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExploreDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isExploreDropdownOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30"
                  onClick={() => setIsExploreDropdownOpen(false)}
                />

                {/* Dropdown Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 right-0 bg-black/95 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl z-40 min-w-[220px] overflow-hidden"
                >
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsExploreDropdownOpen(false)}
                          className="flex items-center space-x-3 px-6 py-4 hover:bg-yellow-400/20 transition-colors group"
                        >
                          <Icon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-medium group-hover:text-yellow-400 transition-colors">
                            {item.label}
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom Sticky Navigation - COMMENTED OUT */}
      {/* <motion.nav
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
      </motion.nav> */}
    </section>
  )
}
