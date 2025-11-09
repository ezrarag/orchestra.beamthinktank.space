'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useUserRole, UserRole } from './useUserRole'

/**
 * Hook to check if user has access to a specific project
 * - beam_admin: access to all projects
 * - partner_admin: access only to their assigned project(s)
 * - musician: access to projects they're part of
 */
export function useProjectAccess(projectId: string) {
  const { user, role, loading: roleLoading } = useUserRole()
  const [projectAccess, setProjectAccess] = useState<{
    hasAccess: boolean
    loading: boolean
    projectId?: string
  }>({
    hasAccess: false,
    loading: true
  })

  useEffect(() => {
    if (roleLoading || !user) {
      setProjectAccess({ hasAccess: false, loading: roleLoading })
      return
    }

    const checkAccess = async () => {
      try {
        // beam_admin has access to all projects
        if (role === 'beam_admin') {
          setProjectAccess({ hasAccess: true, loading: false, projectId })
          return
        }

        // partner_admin: check if they have access to this project
        if (role === 'partner_admin') {
          // Check user document for assignedProjectId
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const assignedProjectId = userData.assignedProjectId || userData.projectId
            
            if (assignedProjectId === projectId) {
              setProjectAccess({ hasAccess: true, loading: false, projectId })
              return
            }
          }
          
          // Also check custom claims
          const tokenResult = await user.getIdTokenResult()
          const claims = tokenResult.claims
          if (claims.projectId === projectId || claims.assignedProjectId === projectId) {
            setProjectAccess({ hasAccess: true, loading: false, projectId })
            return
          }
        }

        // musician: check if they're part of this project
        if (role === 'musician') {
          const musicianDoc = await getDoc(doc(db, 'projectMusicians', `${user.email?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${projectId}`))
          if (musicianDoc.exists()) {
            setProjectAccess({ hasAccess: true, loading: false, projectId })
            return
          }
        }

        setProjectAccess({ hasAccess: false, loading: false })
      } catch (error) {
        console.error('Error checking project access:', error)
        setProjectAccess({ hasAccess: false, loading: false })
      }
    }

    checkAccess()
  }, [user, role, roleLoading, projectId])

  return projectAccess
}

/**
 * Hook to get the project ID that a partner_admin is assigned to
 */
export function usePartnerProject() {
  const { user, role, loading } = useUserRole()
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user || role !== 'partner_admin') {
      setProjectId(null)
      return
    }

    const getProjectId = async () => {
      try {
        // Check user document
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const assignedProjectId = userData.assignedProjectId || userData.projectId
          if (assignedProjectId) {
            setProjectId(assignedProjectId)
            return
          }
        }

        // Check custom claims
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims
        if (claims.projectId || claims.assignedProjectId) {
          setProjectId(claims.projectId || claims.assignedProjectId)
          return
        }
      } catch (error) {
        console.error('Error getting partner project:', error)
      }
    }

    getProjectId()
  }, [user, role, loading])

  return projectId
}

