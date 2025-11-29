'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { User, LogOut } from 'lucide-react'
import OrchestraHero from '@/components/OrchestraHero'

export default function Home() {
  const { user } = useUserRole()
  const [scrollY, setScrollY] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <div className="min-h-screen bg-black">
      <OrchestraHero />

      {/* Floating Avatar Button (Bottom Right) - Appears when signed in and scrolled */}
      <AnimatePresence>
        {user && scrollY > 200 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed bottom-6 right-6 z-50 user-menu-container"
          >
            <motion.button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={user.displayName || user.email?.split('@')[0] || 'User'}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-yellow-400/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </motion.button>

            {/* Dropdown Menu - Opens upward from bottom */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-full right-0 mb-2 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-[#D4AF37]/30 overflow-hidden"
                >
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-[#D4AF37]/20">
                      <p className="text-black font-medium truncate">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (auth) {
                          try {
                            await signOut(auth)
                            setShowUserMenu(false)
                          } catch (error) {
                            console.error('Error signing out:', error)
                          }
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/20 transition-colors text-left"
                    >
                      <LogOut className="h-5 w-5 text-red-500" />
                      <span className="text-black font-medium">Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
