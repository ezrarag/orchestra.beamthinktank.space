'use client'

import { useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export type UserRole = 'beam_admin' | 'partner_admin' | 'musician' | 'audience'

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
          // Get user role from custom claims or user document
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setRole(userData.role || 'musician')
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
