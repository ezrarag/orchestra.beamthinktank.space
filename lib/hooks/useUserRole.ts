'use client'

import { useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export type UserRole = 'beam_admin' | 'partner_admin' | 'board' | 'musician' | 'subscriber' | 'audience'

interface UserWithRole {
  user: User | null
  role: UserRole | null
  loading: boolean
}

export function useUserRole(): UserWithRole {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if auth is initialized
    if (!auth || !db) {
      console.warn('Firebase auth is not initialized. Please check your environment variables.')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          // First, check custom claims (for admin roles set via Firebase Admin SDK)
          const tokenResult = await user.getIdTokenResult()
          const claims = tokenResult.claims
          
          // Check for admin claim in custom claims
          if (claims.beam_admin === true || claims.role === 'beam_admin') {
            setRole('beam_admin')
            setLoading(false)
            return
          }
          
          // Check for partner_admin claim
          if (claims.role === 'partner_admin' || claims.partner_admin === true) {
            setRole('partner_admin')
            setLoading(false)
            return
          }
          
          // Check for board claim
          if (claims.role === 'board' || claims.board === true) {
            setRole('board')
            setLoading(false)
            return
          }
          
          // Check for subscriber claim
          if (claims.beam_subscriber === true || claims.subscriber === true) {
            setRole('subscriber')
            setLoading(false)
            return
          }
          
          // Fall back to Firestore user document
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            // Check if user is a subscriber
            if (userData.subscriber === true) {
              setRole('subscriber')
            } else {
              setRole(userData.role || 'musician')
            }
          } else {
            setRole('musician') // Default role
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          setRole('musician')
        }
      } else {
        setRole(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, role, loading }
}

export function useRequireRole(requiredRole: UserRole) {
  const { user, role, loading } = useUserRole()
  
  const hasAccess = !loading && user && role === requiredRole
  
  return {
    user,
    role,
    loading,
    hasAccess,
    redirect: !loading && (!user || role !== requiredRole)
  }
}

/**
 * Hook to check if user has board access (board role or higher)
 * Board users have read-only access to analytics and project data
 */
export function useBoardAccess() {
  const { user, role, loading } = useUserRole()
  
  // Board, partner_admin, and beam_admin all have board access
  const hasAccess = !loading && user && (
    role === 'board' || 
    role === 'partner_admin' || 
    role === 'beam_admin'
  )
  
  const isReadOnly = role === 'board' // Only board role is read-only
  
  return {
    user,
    role,
    loading,
    hasAccess,
    isReadOnly,
    redirect: !loading && !hasAccess
  }
}
