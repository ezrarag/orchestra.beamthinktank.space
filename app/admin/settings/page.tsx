'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Loader2, Save, Check } from 'lucide-react'
import { useRequireRole } from '@/lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  const [saved, setSaved] = useState(false)

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

      {/* Coming Soon Section */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <SettingsIcon className="h-16 w-16 text-orchestra-gold/30 mx-auto mb-4" />
        <p className="text-orchestra-cream/70 text-lg">
          Additional settings and configuration options coming soon.
        </p>
      </motion.div>
    </div>
  )
}

