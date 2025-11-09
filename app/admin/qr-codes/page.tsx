'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { QRCode, generateCheckInURL } from '@/lib/generateQR'
import { rehearsalSchedule } from '@/app/training/contract-projects/black-diaspora-symphony/data'
import { QrCode, Download, Copy, Check } from 'lucide-react'
import { useRequireRole } from '@/lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'

export default function QRCodesPage() {
  const router = useRouter()
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  if (redirect || !hasAccess) {
    router.push('/admin/dashboard')
    return null
  }

  // Use production URL from env or fallback to production domain
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://orchestra.beamthinktank.space'

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownloadQR = (rehearsal: any) => {
    const url = generateCheckInURL(rehearsal.date, baseUrl)
    // Create a canvas to download the QR code
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size + 60 // Extra space for text
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Generate QR code data URL (we'll use a simple approach)
    // For a better implementation, you'd render the QR code to canvas
    // For now, we'll create a download link to the page itself
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-code-${rehearsal.date}.txt`
    link.click()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <QrCode className="h-8 w-8 text-orchestra-gold" />
          <h1 className="text-3xl font-bold text-orchestra-gold">QR Codes for Rehearsals</h1>
        </div>
        <p className="text-orchestra-cream/70">
          Generate and download QR codes for each rehearsal. Musicians can scan these to check in.
        </p>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-blue-400 font-semibold mb-2">How to Use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-orchestra-cream/80 text-sm">
          <li>Print or display the QR code at the rehearsal venue</li>
          <li>Musicians scan the QR code with their phone camera</li>
          <li>They'll be taken to the check-in page where they sign in and tap "Check In"</li>
          <li>Attendance is automatically recorded in the system</li>
        </ol>
      </motion.div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rehearsalSchedule.map((rehearsal, index) => {
          const checkInUrl = generateCheckInURL(rehearsal.date, baseUrl)
          const isCopied = copiedUrl === checkInUrl

          return (
            <motion.div
              key={rehearsal.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
            >
              {/* Rehearsal Info */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-orchestra-gold mb-2">
                  {(() => {
                    // Parse date string (YYYY-MM-DD) to avoid timezone issues
                    const [year, month, day] = rehearsal.date.split('-').map(Number)
                    const date = new Date(year, month - 1, day)
                    return date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  })()}
                </h3>
                <div className="space-y-1 text-sm text-orchestra-cream/70">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Time:</span> {rehearsal.time}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Type:</span> {rehearsal.type || 'Regular Rehearsal'}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Location:</span> 
                    <span className="text-xs">{rehearsal.location}</span>
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-4 bg-white p-4 rounded-lg">
                <QRCode value={checkInUrl} size={200} />
              </div>

              {/* URL Display */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-orchestra-cream/70 mb-1">
                  Check-in URL:
                </label>
                <div className="flex items-center gap-2 bg-orchestra-dark/50 rounded-lg p-2 border border-orchestra-gold/20">
                  <input
                    type="text"
                    value={checkInUrl}
                    readOnly
                    className="flex-1 bg-transparent text-xs text-orchestra-cream/80 focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopyUrl(checkInUrl)}
                    className="p-1.5 hover:bg-orchestra-gold/20 rounded transition-colors"
                    title="Copy URL"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-orchestra-gold" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={checkInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors text-sm text-center"
                >
                  Test Link
                </a>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-gold font-bold rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Print
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Reference */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-lg font-bold text-orchestra-gold mb-4">Quick Reference</h3>
        <div className="space-y-2 text-sm text-orchestra-cream/80">
          <p>
            <span className="font-medium text-orchestra-gold">Base URL:</span>{' '}
            <code className="bg-orchestra-dark/50 px-2 py-1 rounded">{baseUrl}</code>
          </p>
          <p>
            <span className="font-medium text-orchestra-gold">URL Format:</span>{' '}
            <code className="bg-orchestra-dark/50 px-2 py-1 rounded">
              {baseUrl}/checkin?id=YYYY-MM-DD
            </code>
          </p>
          <p className="text-orchestra-cream/60 text-xs mt-4">
            The rehearsal ID (date) must match the format in your rehearsal schedule (YYYY-MM-DD).
          </p>
        </div>
      </motion.div>
    </div>
  )
}

