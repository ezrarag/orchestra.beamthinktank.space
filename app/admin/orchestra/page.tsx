'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminOrchestraRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    router.replace(`/admin${window.location.hash || ''}`)
  }, [router])

  return null
}
