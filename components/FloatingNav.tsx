'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Home, Calendar, Users, Music, Heart, Menu, X } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: <Home className="h-5 w-5" /> },
  { label: 'Performances', href: '/performances', icon: <Calendar className="h-5 w-5" /> },
  { label: 'Rehearsals', href: '/rehearsals', icon: <Music className="h-5 w-5" /> },
  { label: 'Members', href: '/members', icon: <Users className="h-5 w-5" /> },
  { label: 'Donate', href: '/donate', icon: <Heart className="h-5 w-5" /> },
]

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const { scrollY } = useScroll()
  
  // Transform scroll position to opacity and blur effects
  const navOpacity = useTransform(scrollY, [0, 100], [0.1, 0.9])
  const navBlur = useTransform(scrollY, [0, 100], [0, 40])
  const navBackground = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.9)']
  )

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'performances', 'rehearsals', 'members', 'donate']
      const scrollPosition = window.scrollY + 100

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i])
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Desktop Floating Navigation - Framer Style */}
      <motion.nav
        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 hidden lg:block"
        style={{
          opacity: navOpacity,
          backdropFilter: `blur(${navBlur}px)`,
          backgroundColor: navBackground,
        }}
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-0 px-1 py-1 rounded-full border border-white/30 shadow-2xl relative overflow-hidden" style={{ width: '720px' }}>
          {/* Active indicator - White rounded background that moves */}
          <motion.div
            className="absolute bg-white rounded-full transition-all duration-300"
            layoutId="activeIndicator"
            style={{
              width: '143px',
              height: '48px',
              left: `${(navItems.findIndex(item => 
                item.href === `/${activeSection === 'home' ? '' : activeSection}`
              ) * 100) / (navItems.length - 1)}%`,
              top: '4px',
            }}
          />
          
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative z-10 flex items-center justify-center w-36 h-12 rounded-full transition-all duration-300 hover:scale-110"
              onClick={() => setActiveSection(item.href === '/' ? 'home' : item.href.slice(1))}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="text-orchestra-dark">
                  {item.icon}
                </div>
                <span className="text-xs text-orchestra-dark font-medium">
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.nav>

      {/* Mobile Navigation Toggle */}
      <motion.button
        className="fixed top-6 right-6 z-50 lg:hidden bg-orchestra-gold/90 backdrop-blur-md p-3 rounded-full shadow-2xl"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-orchestra-dark" />
        ) : (
          <Menu className="h-6 w-6 text-orchestra-dark" />
        )}
      </motion.button>

      {/* Mobile Navigation Menu */}
      <motion.div
        className="fixed inset-0 z-40 lg:hidden"
        initial={{ opacity: 0, pointerEvents: 'none' }}
        animate={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
        
        {/* Menu */}
        <motion.div
          className="absolute top-20 right-6 bg-orchestra-cream/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 min-w-[250px]"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{
            opacity: isOpen ? 1 : 0,
            y: isOpen ? 0 : -20,
            scale: isOpen ? 1 : 0.9,
          }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-orchestra-gold/20 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                <div className="text-orchestra-gold">
                  {item.icon}
                </div>
                <span className="text-orchestra-dark font-medium">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
