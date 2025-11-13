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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Check-In Test Utility</h1>
          <p className="text-gray-300">
            Test QR check-in functionality before rehearsals
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Rehearsals</h2>
          
          <div className="space-y-4">
            {upcomingRehearsals.map((rehearsal) => {
              const checkInURL = generateCheckInURL(rehearsal.date)
              
              return (
                <div
                  key={rehearsal.date}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
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
                      <p className="text-gray-300 text-sm">{rehearsal.time} - {rehearsal.location}</p>
                      {rehearsal.type && (
                        <p className="text-purple-300 text-xs mt-1">Type: {rehearsal.type}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyCheckInURL(rehearsal.date)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy URL
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">Check-In URL:</p>
                      <code className="text-xs text-gray-300 bg-black/20 px-2 py-1 rounded break-all">
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

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Test Check-In</h2>
          <p className="text-gray-300 text-sm mb-4">
            Simulate a check-in to verify Firestore writes are working correctly.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="rehearsal-select" className="block text-sm font-medium text-gray-200 mb-2">
                Select Rehearsal
              </label>
              <select
                id="rehearsal-select"
                value={selectedRehearsal}
                onChange={(e) => setSelectedRehearsal(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
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

