'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Loader2, Save, Check, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useRequireRole, useUserRole } from '@/lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { rosterData } from '@/app/training/contract-projects/black-diaspora-symphony/data'
import { auth } from '@/lib/firebase'

export default function SettingsPage() {
  const router = useRouter()
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  const { user } = useUserRole()
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (redirect || !hasAccess) {
    router.push('/admin/dashboard')
    return null
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSyncRoster = async () => {
    if (!user || !db) {
      setSyncResult({
        success: false,
        message: 'Please sign in to sync roster data.'
      })
      return
    }

    setSyncing(true)
    setSyncResult(null)

    try {
      // Get user's ID token for verification
      const token = await user.getIdToken()
      
      // Verify admin access via API
      const verifyResponse = await fetch('/api/sync-roster', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json()
        throw new Error(error.error || 'Admin access verification failed')
      }

      // Now sync the data using client-side Firebase SDK
      let migrated = 0
      let skipped = 0
      const errors: string[] = []

      for (const section of rosterData) {
        const instrument = section.instrument
        
        for (const musician of section.musicianDetails || []) {
          if (!musician.name) {
            skipped++
            continue
          }

          // Generate unique ID from email or name
          const emailPart = musician.email 
            ? musician.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            : musician.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
          
          const docId = `${emailPart}_black-diaspora-symphony`
          
          // Map status to Firestore format
          let status = 'pending'
          if (musician.status === 'Confirmed') {
            status = 'confirmed'
          } else if (musician.status === 'Interested') {
            status = 'pending'
          } else if (musician.status === 'Pending') {
            status = 'pending'
          } else if (musician.status === 'Open') {
            status = 'open'
          }

          // Use musician's individual instrument if specified, otherwise use section instrument
          const musicianInstrument = (musician as any).instrument || instrument

          const musicianData = {
            projectId: 'black-diaspora-symphony',
            instrument: musicianInstrument,
            name: musician.name,
            email: musician.email || null,
            phone: musician.phone || null,
            status: status,
            role: 'musician',
            notes: musician.notes || null,
            bio: musician.bio || null,
            headshotUrl: musician.headshotUrl || null,
            mediaEmbedUrl: musician.mediaEmbedUrl || null,
            supportLink: musician.supportLink || null,
            source: musician.source || 'Admin Sync',
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }

          try {
            await setDoc(doc(db, 'projectMusicians', docId), musicianData, { merge: true })
            migrated++
          } catch (error: any) {
            errors.push(`${musician.name}: ${error.message}`)
            skipped++
          }
        }
      }

      setSyncResult({
        success: true,
        message: `Successfully synced ${migrated} musicians. ${skipped > 0 ? `${skipped} skipped.` : ''}`,
        count: migrated
      })

      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000)

    } catch (error: any) {
      console.error('Sync error:', error)
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync roster data. Please try again.'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-orchestra-gold mb-2 flex items-center">
          <SettingsIcon className="h-8 w-8 mr-3" />
          Settings
        </h1>
        <p className="text-orchestra-cream/70">Manage BEAM Orchestra platform settings</p>
      </motion.div>

      {/* Settings Sections */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-orchestra-gold mb-6">General Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Platform Name
            </label>
            <input
              type="text"
              defaultValue="BEAM Orchestra"
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Default Project Duration (days)
            </label>
            <input
              type="number"
              defaultValue="90"
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            />
          </div>
        </div>

        <div className="mt-6">
          <motion.button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Changes</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Roster Sync Section */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-orchestra-gold mb-4">Roster Data Sync</h2>
        <p className="text-orchestra-cream/70 mb-4 text-sm">
          Sync roster data from <code className="bg-orchestra-dark/50 px-2 py-1 rounded">data.ts</code> to Firestore.
          This will update the <code className="bg-orchestra-dark/50 px-2 py-1 rounded">projectMusicians</code> collection
          with the latest musician information.
        </p>

        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
              syncResult.success
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${syncResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {syncResult.success ? 'Sync Complete' : 'Sync Failed'}
              </p>
              <p className={`text-sm mt-1 ${syncResult.success ? 'text-green-200' : 'text-red-200'}`}>
                {syncResult.message}
              </p>
            </div>
          </motion.div>
        )}

        <motion.button
          onClick={handleSyncRoster}
          disabled={syncing || !user}
          className="flex items-center space-x-2 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-orchestra-dark font-bold rounded-lg transition-colors"
          whileHover={!syncing && user ? { scale: 1.05 } : {}}
          whileTap={!syncing && user ? { scale: 0.95 } : {}}
        >
          {syncing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              <span>Sync Roster Data</span>
            </>
          )}
        </motion.button>

        {!user && (
          <p className="text-orchestra-cream/50 text-xs mt-2">
            Please sign in to sync roster data.
          </p>
        )}
      </motion.div>

      {/* Coming Soon Section */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <SettingsIcon className="h-16 w-16 text-orchestra-gold/30 mx-auto mb-4" />
        <p className="text-orchestra-cream/70 text-lg">
          Additional settings and configuration options coming soon.
        </p>
      </motion.div>
    </div>
  )
}

