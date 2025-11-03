'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Loader2 } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRequireRole } from '@/lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'

export default function MusiciansPage() {
  const router = useRouter()
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  
  const [musicians, setMusicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (roleLoading) return
    
    if (redirect || !hasAccess) {
      router.push('/admin/dashboard')
    }
  }, [hasAccess, redirect, roleLoading, router])

  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        if (!db) {
          setLoading(false)
          return
        }

        const q = query(
          collection(db, 'users'),
          orderBy('name', 'asc'),
          limit(100)
        )
        const snapshot = await getDocs(q)
        const musiciansData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setMusicians(musiciansData)
      } catch (error) {
        console.error('Error fetching musicians:', error)
      } finally {
        setLoading(false)
      }
    }

    if (hasAccess && !redirect) {
      fetchMusicians()
    }
  }, [hasAccess, redirect])

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (redirect || !hasAccess) {
    return null
  }

  const filteredMusicians = musicians.filter(musician =>
    musician.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-orchestra-gold mb-2 flex items-center">
          <Users className="h-8 w-8 mr-3" />
          Musicians
        </h1>
        <p className="text-orchestra-cream/70">Manage all musicians in the BEAM ecosystem</p>
      </motion.div>

      {/* Search */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orchestra-cream/50" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search musicians by name or email..."
            className="w-full pl-12 pr-4 py-3 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
          />
        </div>
      </motion.div>

      {/* Musicians List */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="p-6 border-b border-orchestra-gold/20">
          <h2 className="text-xl font-bold text-orchestra-gold">
            All Musicians ({filteredMusicians.length})
          </h2>
        </div>
        
        {filteredMusicians.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-orchestra-gold/30 mx-auto mb-4" />
            <p className="text-orchestra-cream/70">
              {searchTerm ? 'No musicians found matching your search.' : 'No musicians found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orchestra-gold/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orchestra-gold/10">
                {filteredMusicians.map((musician) => (
                  <tr
                    key={musician.id}
                    className="hover:bg-orchestra-gold/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-orchestra-cream font-medium">
                      {musician.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-orchestra-cream/70">
                      {musician.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-orchestra-cream/70">
                      {musician.city || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        musician.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {musician.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

