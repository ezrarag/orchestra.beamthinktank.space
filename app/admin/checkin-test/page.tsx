'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { checkIn } from '@/lib/attendance'
import { rehearsalSchedule } from '@/app/training/contract-projects/black-diaspora-symphony/data'
import { generateCheckInURL, QRCode } from '@/lib/generateQR'
import { CheckCircle, AlertCircle, Copy, QrCode } from 'lucide-react'

export default function CheckInTestPage() {
  const router = useRouter()
  const { user, role, loading } = useUserRole()
  const [selectedRehearsal, setSelectedRehearsal] = useState<string>('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  // Only admins can access this page
  if (!loading && (!user || (role !== 'beam_admin' && role !== 'partner_admin'))) {
    router.push('/admin/dashboard')
    return null
  }

  const upcomingRehearsals = rehearsalSchedule.filter(r => {
    const rehearsalDate = new Date(r.date)
    return rehearsalDate >= new Date()
  })

  const handleTestCheckIn = async () => {
    if (!selectedRehearsal || !user) {
      setTestResult({ success: false, message: 'Please select a rehearsal and ensure you are signed in.' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const rehearsal = rehearsalSchedule.find(r => r.date === selectedRehearsal)
      if (!rehearsal) {
        throw new Error('Rehearsal not found')
      }

      await checkIn(
        user.uid,
        user.displayName || 'Test User',
        user.email,
        selectedRehearsal,
        rehearsal.location
      )

      setTestResult({
        success: true,
        message: `Successfully checked in for ${rehearsal.date}. Check-in recorded in Firestore.`
      })
    } catch (error: any) {
      console.error('Test check-in error:', error)
      setTestResult({
        success: false,
        message: `Check-in failed: ${error.message}`
      })
    } finally {
      setTesting(false)
    }
  }

  const copyCheckInURL = (rehearsalId: string) => {
    try {
      const url = generateCheckInURL(rehearsalId)
      navigator.clipboard.writeText(url)
      alert('Check-in URL copied to clipboard!')
    } catch (error: any) {
      alert(`Error generating URL: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Check-In Test Utility</h1>
          <p className="text-orchestra-cream/70">
            Test QR check-in functionality before rehearsals
          </p>
        </div>

        <div className="mb-6 rounded-[24px] border border-orchestra-gold/20 bg-white/[0.04] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Rehearsals</h2>
          
          <div className="space-y-4">
            {upcomingRehearsals.map((rehearsal) => {
              const checkInURL = generateCheckInURL(rehearsal.date)
              
              return (
                <div
                  key={rehearsal.date}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {new Date(rehearsal.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                      <p className="text-sm text-orchestra-cream/70">{rehearsal.time} - {rehearsal.location}</p>
                      {rehearsal.type && (
                        <p className="mt-1 text-xs text-orchestra-gold/80">Type: {rehearsal.type}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyCheckInURL(rehearsal.date)}
                        className="flex items-center gap-2 rounded-lg border border-orchestra-gold/25 bg-orchestra-gold/10 px-3 py-2 text-sm text-orchestra-gold transition hover:bg-orchestra-gold/15"
                      >
                        <Copy className="w-4 h-4" />
                        Copy URL
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="mb-1 text-xs text-white/45">Check-In URL:</p>
                      <code className="break-all rounded bg-black/20 px-2 py-1 text-xs text-white/70">
                        {checkInURL}
                      </code>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <QRCode value={checkInURL} size={80} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-orchestra-gold/20 bg-white/[0.04] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <h2 className="text-2xl font-bold text-white mb-4">Test Check-In</h2>
          <p className="mb-4 text-sm text-orchestra-cream/70">
            Simulate a check-in to verify Firestore writes are working correctly.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="rehearsal-select" className="mb-2 block text-sm font-medium text-orchestra-cream/75">
                Select Rehearsal
              </label>
              <select
                id="rehearsal-select"
                value={selectedRehearsal}
                onChange={(e) => setSelectedRehearsal(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              >
                <option value="">-- Select a rehearsal --</option>
                {upcomingRehearsals.map((rehearsal) => (
                  <option key={rehearsal.date} value={rehearsal.date}>
                    {new Date(rehearsal.date).toLocaleDateString()} - {rehearsal.time}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTestCheckIn}
              disabled={testing || !selectedRehearsal || !user}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orchestra-gold px-6 py-3 text-orchestra-dark font-semibold transition-all duration-200 hover:bg-orchestra-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testing check-in...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Test Check-In</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <p
                    className={
                      testResult.success ? 'text-green-200' : 'text-red-200'
                    }
                  >
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
