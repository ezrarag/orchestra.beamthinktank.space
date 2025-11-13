'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { User, LogOut, LogIn, LayoutDashboard, ChevronDown, Settings, Home } from 'lucide-react'
import Link from 'next/link'

export default function UserMenu() {
  const { user, role, loading } = useUserRole()
  const [isOpen, setIsOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (!auth) {
      setAuthError('Firebase Auth is not available. Please configure Firebase.')
      return
    }

    setAuthError(null)
    setIsOpen(false)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error: any) {
      console.error('Error signing in:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError(`Authentication failed: ${error.message}`)
      }
    }
  }

  const handleSignOut = async () => {
    if (!auth) return

    try {
      await signOut(auth)
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (loading) {
    return (
      <div className="h-10 w-10 rounded-full bg-orchestra-gold/20 animate-pulse" />
    )
  }

  return (
    <div className="user-menu-container relative">
      {!user ? (
        <button
          onClick={handleSignIn}
          className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-cream rounded-lg transition-colors border border-orchestra-gold/30"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 rounded-lg transition-colors border border-orchestra-gold/30"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-orchestra-gold/30 flex items-center justify-center">
                <User className="h-4 w-4 text-orchestra-cream" />
              </div>
            )}
            <span className="hidden sm:inline text-orchestra-cream text-sm font-medium max-w-[120px] truncate">
              {user.displayName || user.email}
            </span>
            <ChevronDown className={`h-4 w-4 text-orchestra-cream transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-orchestra-dark/95 backdrop-blur-md rounded-xl border border-orchestra-gold/30 shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-orchestra-gold/20">
                    <div className="flex items-center space-x-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-orchestra-gold/30 flex items-center justify-center">
                          <User className="h-6 w-6 text-orchestra-cream" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-orchestra-cream font-medium truncate">
                          {user.displayName || 'User'}
                        </p>
                        <p className="text-sm text-orchestra-cream/70 truncate">
                          {user.email}
                        </p>
                        {role && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-orchestra-gold/20 text-orchestra-gold rounded-full">
                            {role === 'beam_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* Profile/Account Link */}
                    <Link
                      href="/members"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-orchestra-gold/10 text-orchestra-cream transition-colors group"
                    >
                      <User className="h-5 w-5 text-orchestra-gold group-hover:scale-110 transition-transform" />
                      <span className="font-medium">My Profile</span>
                    </Link>

                    {/* Admin Dashboard Link - Always visible, but only accessible if admin */}
                    <Link
                      href="/admin/dashboard"
                      onClick={(e) => {
                        if (role !== 'beam_admin' && role !== 'partner_admin') {
                          e.preventDefault()
                          alert('Admin access required. Please contact an administrator.')
                        } else {
                          setIsOpen(false)
                        }
                      }}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
                        role === 'beam_admin' || role === 'partner_admin'
                          ? 'hover:bg-orchestra-gold/10 text-orchestra-cream'
                          : 'hover:bg-gray-500/10 text-orchestra-cream/60 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <LayoutDashboard className={`h-5 w-5 group-hover:scale-110 transition-transform ${
                        role === 'beam_admin' || role === 'partner_admin' ? 'text-orchestra-gold' : 'text-gray-400'
                      }`} />
                      <span className="font-medium">
                        Admin Dashboard
                        {role !== 'beam_admin' && role !== 'partner_admin' && (
                          <span className="ml-2 text-xs text-gray-400">(Admin Only)</span>
                        )}
                      </span>
                    </Link>

                    {/* Board Dashboard Link - Visible to board members and admins */}
                    {(role === 'board' || role === 'beam_admin' || role === 'partner_admin') && (
                      <Link
                        href="/admin/board"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-orchestra-gold/10 text-orchestra-cream transition-colors group"
                      >
                        <LayoutDashboard className="h-5 w-5 text-orchestra-gold group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Board Dashboard</span>
                      </Link>
                    )}

                    {/* Divider */}
                    <div className="border-t border-orchestra-gold/20 my-1" />

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-orchestra-cream transition-colors group"
                    >
                      <LogOut className="h-5 w-5 text-red-400 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>

                  {authError && (
                    <div className="p-4 bg-red-500/10 border-t border-red-500/20">
                      <p className="text-sm text-red-300">{authError}</p>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

