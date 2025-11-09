'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock, User, Mail, Download } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { rehearsalSchedule } from '@/app/training/contract-projects/black-diaspora-symphony/data'

interface AttendanceRecord {
  id: string
  userId: string
  name: string
  email: string | null
  rehearsalId: string
  timestamp: Timestamp | null
  location: string
}

export default function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRehearsal, setSelectedRehearsal] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'attendance'),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: AttendanceRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId || '',
            name: data.name || 'Unknown',
            email: data.email || null,
            rehearsalId: data.rehearsalId || '',
            timestamp: data.timestamp || null,
            location: data.location || '',
          }
        })
        setAttendance(records)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading attendance:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const getRehearsalInfo = (rehearsalId: string) => {
    return rehearsalSchedule.find(r => r.date === rehearsalId)
  }

  const filteredAttendance = selectedRehearsal
    ? attendance.filter(a => a.rehearsalId === selectedRehearsal)
    : attendance

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Rehearsal Date', 'Time', 'Location', 'Check-in Time']
    const rows = filteredAttendance.map(record => {
      const rehearsal = getRehearsalInfo(record.rehearsalId)
      const checkInTime = record.timestamp
        ? new Date(record.timestamp.toMillis()).toLocaleString()
        : 'N/A'
      
      return [
        record.name,
        record.email || '',
        rehearsal ? new Date(rehearsal.date).toLocaleDateString() : record.rehearsalId,
        rehearsal?.time || 'N/A',
        record.location,
        checkInTime,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orchestra-gold mb-2">Attendance Records</h1>
          <p className="text-orchestra-cream/70">
            View and manage rehearsal check-ins
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter by Rehearsal */}
      <div className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/20">
        <label className="block text-orchestra-cream text-sm font-medium mb-2">
          Filter by Rehearsal
        </label>
        <select
          value={selectedRehearsal || ''}
          onChange={(e) => setSelectedRehearsal(e.target.value || null)}
          className="w-full bg-orchestra-dark border border-orchestra-gold/30 rounded-lg px-4 py-2 text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
        >
          <option value="">All Rehearsals</option>
          {rehearsalSchedule.map((rehearsal) => (
            <option key={rehearsal.date} value={rehearsal.date}>
              {new Date(rehearsal.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} - {rehearsal.type}
            </option>
          ))}
        </select>
      </div>

      {/* Attendance List */}
      <div className="bg-orchestra-dark/50 rounded-lg border border-orchestra-gold/20 overflow-hidden">
        {filteredAttendance.length === 0 ? (
          <div className="p-8 text-center text-orchestra-cream/70">
            No attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orchestra-gold/10 border-b border-orchestra-gold/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Rehearsal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Check-in Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orchestra-gold/10">
                {filteredAttendance.map((record) => {
                  const rehearsal = getRehearsalInfo(record.rehearsalId)
                  const checkInTime = record.timestamp
                    ? new Date(record.timestamp.toMillis())
                    : null

                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-orchestra-gold/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-orchestra-gold mr-2" />
                          <span className="text-orchestra-cream font-medium">{record.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.email ? (
                          <div className="flex items-center text-orchestra-cream/80">
                            <Mail className="w-4 h-4 text-orchestra-gold/70 mr-2" />
                            {record.email}
                          </div>
                        ) : (
                          <span className="text-orchestra-cream/50">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {rehearsal ? (
                          <div className="space-y-1">
                            <div className="flex items-center text-orchestra-cream">
                              <Calendar className="w-4 h-4 text-orchestra-gold mr-2" />
                              <span className="text-sm">
                                {new Date(rehearsal.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center text-orchestra-cream/70 text-xs">
                              <Clock className="w-3 h-3 text-orchestra-gold/70 mr-1" />
                              {rehearsal.time}
                            </div>
                            <div className="text-xs text-orchestra-gold/80 mt-1">
                              {rehearsal.type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-orchestra-cream/50">{record.rehearsalId}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-orchestra-cream/80 text-sm max-w-xs">
                          <MapPin className="w-4 h-4 text-orchestra-gold/70 mr-2 flex-shrink-0" />
                          <span className="truncate">{record.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-orchestra-cream/80 text-sm">
                        {checkInTime ? (
                          <div>
                            <div>{checkInTime.toLocaleDateString()}</div>
                            <div className="text-xs text-orchestra-cream/60">
                              {checkInTime.toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-orchestra-cream/50">—</span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/20">
          <div className="text-orchestra-cream/70 text-sm mb-1">Total Check-ins</div>
          <div className="text-2xl font-bold text-orchestra-gold">{filteredAttendance.length}</div>
        </div>
        <div className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/20">
          <div className="text-orchestra-cream/70 text-sm mb-1">Unique Musicians</div>
          <div className="text-2xl font-bold text-orchestra-gold">
            {new Set(filteredAttendance.map(a => a.userId)).size}
          </div>
        </div>
        <div className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/20">
          <div className="text-orchestra-cream/70 text-sm mb-1">Rehearsals Tracked</div>
          <div className="text-2xl font-bold text-orchestra-gold">
            {new Set(filteredAttendance.map(a => a.rehearsalId)).size}
          </div>
        </div>
      </div>
    </div>
  )
}

