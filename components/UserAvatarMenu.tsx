'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { User, LogOut, Bell, Calendar, CheckCircle } from 'lucide-react'
import { EventNotification, Event } from '@/lib/types/events'
import Link from 'next/link'

interface UserAvatarMenuProps {
  scrollY?: number
  showThreshold?: number
}

export default function UserAvatarMenu({ scrollY = 0, showThreshold = 200 }: UserAvatarMenuProps) {
  const { user } = useUserRole()
  const [showMenu, setShowMenu] = useState(false)
  const [notifications, setNotifications] = useState<EventNotification[]>([])
  const [activeNotifications, setActiveNotifications] = useState<EventNotification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications when menu opens or when user changes
  useEffect(() => {
    if (showMenu) {
      loadNotifications()
    }
  }, [showMenu, user])

  const loadNotifications = async () => {
    if (!db) return
    
    const email = user?.email || localStorage.getItem('rsvpEmail')
    if (!email) {
      setLoadingNotifications(false)
      return
    }
    
    // Note: Firestore rules require authentication to read notifications
    // If user is not authenticated, we'll show empty state
    if (!user) {
      setLoadingNotifications(false)
      setActiveNotifications([])
      setNotifications([])
      setUnreadCount(0)
      return
    }
    
    setLoadingNotifications(true)
    try {
      // Query notifications by email (requires authentication per Firestore rules)
      // Note: We query without orderBy to avoid needing a composite index, then sort client-side
      const notificationsRef = collection(db, 'eventNotifications')
      const q = query(
        notificationsRef,
        where('email', '==', email),
        limit(50) // Get more to filter out past events
      )
      
      const snapshot = await getDocs(q)
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
      })) as EventNotification[]
      
      // Sort by timestamp descending client-side
      notificationsData.sort((a, b) => {
        const aTime = a.timestamp instanceof Date 
          ? a.timestamp.getTime() 
          : a.timestamp instanceof Timestamp
            ? a.timestamp.toDate().getTime()
            : 0
        const bTime = b.timestamp instanceof Date 
          ? b.timestamp.getTime() 
          : b.timestamp instanceof Timestamp
            ? b.timestamp.toDate().getTime()
            : 0
        return bTime - aTime
      })

      setNotifications(notificationsData)

      // Filter out notifications for past events
      const now = new Date()
      const activeNotificationsData: EventNotification[] = []
      
      // Check each notification's event date
      for (const notification of notificationsData) {
        try {
          // Fetch event details to check date
          const eventDoc = await getDoc(doc(db, 'events', notification.eventId))
          if (eventDoc.exists()) {
            const eventData = eventDoc.data()
            const eventDate = eventData.date?.toDate 
              ? eventData.date.toDate() 
              : eventData.date instanceof Timestamp 
                ? eventData.date.toDate() 
                : new Date(eventData.date)
            
            // Only include if event is in the future (or today)
            // Compare dates without time to include events happening today
            const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            if (eventDateOnly >= nowDateOnly) {
              activeNotificationsData.push(notification)
            }
          } else {
            // Event not found - include notification anyway (event might have been deleted)
            activeNotificationsData.push(notification)
          }
        } catch (error) {
          console.error(`Error checking event ${notification.eventId}:`, error)
          // If we can't check, include it (better to show than hide)
          activeNotificationsData.push(notification)
        }
      }

      setActiveNotifications(activeNotificationsData)
      setUnreadCount(activeNotificationsData.filter(n => !n.read).length)
      
      // Debug logging
      console.log('Loaded notifications:', {
        total: notificationsData.length,
        active: activeNotificationsData.length,
        email: email
      })
    } catch (error) {
      console.error('Error loading notifications:', error)
      // If error is due to permissions, show empty state
      setNotifications([])
      setActiveNotifications([])
      setUnreadCount(0)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!db) return
    
    try {
      await updateDoc(doc(db, 'eventNotifications', notificationId), {
        read: true,
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setActiveNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-avatar-menu-container')) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Show avatar if user is logged in OR if there's an RSVP email in localStorage
  const shouldShow = user || localStorage.getItem('rsvpEmail')
  const displayEmail = user?.email || localStorage.getItem('rsvpEmail') || ''
  const displayName = user?.displayName || displayEmail.split('@')[0] || 'User'

  if (!shouldShow || scrollY < showThreshold) {
    return null
  }

  return (
    <AnimatePresence>
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
        className="fixed bottom-6 right-6 z-50 user-avatar-menu-container"
      >
        <motion.button
          onClick={() => setShowMenu(!showMenu)}
          className="relative flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={displayName}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-yellow-400/30 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
          )}
          
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-[#D4AF37] text-black text-xs font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-full right-0 mb-2 w-80 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-[#D4AF37]/30 overflow-hidden"
            >
              <div className="py-2">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-[#D4AF37]/20">
                  <p className="text-black font-medium truncate">
                    {displayName}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {displayEmail}
                  </p>
                </div>

                {/* Notifications Section - Only show if there are active/future events */}
                {loadingNotifications ? (
                  <div className="max-h-64 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-[#D4AF37]/10">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#D4AF37]" />
                        <span className="text-sm font-semibold text-black">Event History</span>
                      </div>
                    </div>
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                      Loading...
                    </div>
                  </div>
                ) : activeNotifications.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-[#D4AF37]/10">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#D4AF37]" />
                        <span className="text-sm font-semibold text-black">Event History</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto px-2 py-0.5 bg-[#D4AF37] text-black text-xs font-bold rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {activeNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                            !notification.read ? 'bg-[#D4AF37]/5' : ''
                          }`}
                          onClick={() => {
                            if (notification.id && !notification.read) {
                              markAsRead(notification.id)
                            }
                            setShowMenu(false)
                            if (notification.eventId) {
                              window.location.href = `/tickets/${notification.eventId}`
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 mt-0.5 ${
                              notification.read ? 'text-gray-400' : 'text-[#D4AF37]'
                            }`}>
                              {notification.type === 'rsvp_confirmed' ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <Calendar className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                notification.read ? 'text-gray-600' : 'text-black'
                              }`}>
                                {notification.eventTitle}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.timestamp instanceof Date
                                  ? notification.timestamp.toLocaleDateString()
                                  : new Date(notification.timestamp as any).toLocaleDateString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-[#D4AF37] rounded-full mt-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="border-t border-[#D4AF37]/20">
                  <Link
                    href="/tickets"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Calendar className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-black font-medium">View All Events</span>
                  </Link>
                  
                  {user && (
                    <button
                      onClick={async () => {
                        if (auth) {
                          try {
                            await signOut(auth)
                            localStorage.removeItem('rsvpEmail')
                            setShowMenu(false)
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
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

