'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlus, 
  Copy, 
  Check, 
  Mail, 
  Phone,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Send,
  FileText
} from 'lucide-react'
import { db, auth } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'
import { useRequireRole } from '@/lib/hooks/useUserRole'
import Link from 'next/link'

interface Prospect {
  id: string
  name: string
  email: string | null
  phone: string | null
  instrument: string | null
  projectId: string
  status: 'pending' | 'confirmed' | 'declined'
  confirmationUrl?: string
  confirmationToken?: string
  invitedAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export default function ProjectInvitesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  
  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [instrument, setInstrument] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Bulk invite state
  const [bulkInput, setBulkInput] = useState('')
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  
  // Prospects state
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Check admin access
  useEffect(() => {
    if (roleLoading) return
    
    if (redirect || !hasAccess) {
      router.push('/admin/dashboard')
    }
  }, [hasAccess, redirect, roleLoading, router])

  // Subscribe to prospects for this project
  useEffect(() => {
    if (!projectId || !db) return

    const q = query(
      collection(db, 'prospects'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prospectsData: Prospect[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          prospectsData.push({
            id: doc.id,
            ...data,
          } as Prospect)
        })
        
        // Generate confirmation URLs for prospects that don't have them
        const prospectsWithUrls = prospectsData.map((prospect) => {
          if (prospect.confirmationUrl) return prospect
          
          if (prospect.confirmationToken) {
            const baseUrl = window.location.origin
            return {
              ...prospect,
              confirmationUrl: `${baseUrl}/confirm-invite?token=${prospect.confirmationToken}&prospectId=${prospect.id}`
            }
          }
          
          return prospect
        })
        
        setProspects(prospectsWithUrls)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching prospects:', error)
        showToast('error', 'Failed to load invites')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [projectId])

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }

  const getAuthToken = async (): Promise<string | null> => {
    if (!auth?.currentUser) {
      showToast('error', 'Please sign in to continue')
      return null
    }
    
    try {
      const token = await auth.currentUser.getIdToken()
      return token
    } catch (error) {
      console.error('Error getting auth token:', error)
      showToast('error', 'Authentication failed')
      return null
    }
  }

  const handleInvite = async (inviteData: {
    name: string
    email?: string
    phone?: string
    instrument?: string
  }) => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const response = await fetch('/api/invite-musician', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...inviteData,
          projectId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      return data
    } catch (error: any) {
      console.error('Error sending invite:', error)
      throw error
    }
  }

  const handleQuickInvite = async () => {
    if (!name.trim() || (!email.trim() && !phone.trim())) {
      showToast('error', 'Name and either email or phone are required')
      return
    }

    setIsSubmitting(true)
    try {
      await handleInvite({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        instrument: instrument.trim() || undefined,
      })

      showToast('success', `Invite sent to ${email.trim() || phone.trim()}`)
      
      // Reset form
      setName('')
      setEmail('')
      setPhone('')
      setInstrument('')
    } catch (error: any) {
      showToast('error', error.message || 'Could not send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkInvite = async () => {
    if (!bulkInput.trim()) {
      showToast('error', 'Please enter at least one musician')
      return
    }

    const lines = bulkInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      showToast('error', 'Please enter valid data')
      return
    }

    setIsBulkSubmitting(true)
    let successCount = 0
    let errorCount = 0

    for (const line of lines) {
      try {
        // Parse CSV format: Name, Email, Instrument (or Name, Phone, Instrument)
        const parts = line.split(',').map((p) => p.trim())
        
        if (parts.length < 2) {
          errorCount++
          continue
        }

        const name = parts[0]
        const secondField = parts[1]
        const instrument = parts[2] || ''

        // Determine if second field is email or phone
        const isEmail = secondField.includes('@')
        
        await handleInvite({
          name,
          [isEmail ? 'email' : 'phone']: secondField,
          instrument,
        })

        successCount++
        
        // Small delay between invites to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300))
      } catch (error) {
        errorCount++
      }
    }

    setIsBulkSubmitting(false)
    setBulkInput('')

    if (successCount > 0) {
      showToast('success', `Successfully sent ${successCount} invite(s)`)
    }
    if (errorCount > 0) {
      showToast('error', `Failed to send ${errorCount} invite(s)`)
    }
  }

  const copyToClipboard = async (url: string, prospectId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(prospectId)
      showToast('info', 'Link copied!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast('error', 'Failed to copy link')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
      declined: 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp.toMillis()).toLocaleDateString()
  }

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

  return (
    <div className="space-y-8">
      {/* Header with Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2 text-sm text-orchestra-cream/70 mb-4">
          <Link href="/admin/dashboard" className="hover:text-orchestra-gold transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/projects" className="hover:text-orchestra-gold transition-colors">
            Projects
          </Link>
          <span>/</span>
          <Link href={`/admin/projects/${projectId}`} className="hover:text-orchestra-gold transition-colors">
            {projectId}
          </Link>
          <span>/</span>
          <span className="text-orchestra-gold">Invites</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orchestra-gold mb-2 flex items-center">
              <UserPlus className="h-8 w-8 mr-3" />
              Invite Musicians
            </h1>
            <p className="text-orchestra-cream/70">
              Invite musicians to confirm participation and update roster automatically.
            </p>
          </div>
          <Link
            href={`/admin/projects/${projectId}`}
            className="flex items-center space-x-2 px-4 py-2 text-orchestra-cream hover:text-orchestra-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Project</span>
          </Link>
        </div>
      </motion.div>

      {/* Quick Invite Form */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-orchestra-gold mb-4 flex items-center">
          <Send className="h-5 w-5 mr-2" />
          Quick Invite
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Instrument
            </label>
            <input
              type="text"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="Violin"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2 flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2 flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-xs text-orchestra-cream/60 mb-3">
            * At least email or phone is required
          </p>
          <motion.button
            onClick={handleQuickInvite}
            disabled={isSubmitting || !name.trim() || (!email.trim() && !phone.trim())}
            className="flex items-center space-x-2 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:bg-orchestra-gold/50 disabled:cursor-not-allowed text-orchestra-dark font-bold rounded-lg transition-colors"
            whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                <span>Invite Musician</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Bulk Invite */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-orchestra-gold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Bulk Invite
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-orchestra-cream mb-2">
            Paste multiple musicians (one per line)
          </label>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            className="w-full px-4 py-3 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold h-32 font-mono text-sm"
            placeholder={`Name, Email, Instrument\nJane Doe, jane@example.com, Cello\nBob Smith, bob@example.com, Viola`}
          />
          <p className="text-xs text-orchestra-cream/60 mt-2">
            Format: Name, Email/Phone, Instrument (one per line)
          </p>
        </div>
        
        <motion.button
          onClick={handleBulkInvite}
          disabled={isBulkSubmitting || !bulkInput.trim()}
          className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          whileHover={{ scale: isBulkSubmitting ? 1 : 1.05 }}
          whileTap={{ scale: isBulkSubmitting ? 1 : 0.95 }}
        >
          {isBulkSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Users className="h-5 w-5" />
              <span>Send Bulk Invites</span>
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Invites Sent Table */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="p-6 border-b border-orchestra-gold/20">
          <h2 className="text-xl font-bold text-orchestra-gold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Invites Sent ({prospects.length})
          </h2>
        </div>
        
        {prospects.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="h-16 w-16 text-orchestra-gold/30 mx-auto mb-4" />
            <p className="text-orchestra-cream/70">No invites sent yet. Use the form above to invite musicians.</p>
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
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Instrument
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orchestra-gold/10">
                {prospects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className="hover:bg-orchestra-gold/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-orchestra-cream font-medium">
                      {prospect.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-orchestra-cream/70">
                        {prospect.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="text-sm">{prospect.email}</span>
                          </div>
                        )}
                        {prospect.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span className="text-sm">{prospect.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-orchestra-cream/70">
                      {prospect.instrument || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(prospect.status)}
                    </td>
                    <td className="px-6 py-4 text-orchestra-cream/70 text-sm">
                      {formatDate(prospect.invitedAt || prospect.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {prospect.confirmationUrl && (
                        <motion.button
                          onClick={() => copyToClipboard(prospect.confirmationUrl!, prospect.id)}
                          className="flex items-center space-x-2 px-3 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-gold rounded-lg transition-colors text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {copiedId === prospect.id ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm border flex items-center space-x-3 ${
                toast.type === 'success'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
              }`}
            >
              {toast.type === 'success' && <Check className="h-5 w-5" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {toast.type === 'info' && <Copy className="h-5 w-5" />}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
