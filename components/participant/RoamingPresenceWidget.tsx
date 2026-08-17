'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Globe, Compass, CheckCircle2, Clock, Plus, X, Sparkles } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { getProfileById, updateParticipantRoamingPresence } from '@/lib/profiles'
import type { Profile, CurrentLiveLocation } from '@/lib/types/profile'

const POPULAR_REGIONAL_NODES = [
  'Milwaukee, WI',
  'Chicago, IL',
  'Concord',
  'Orlando, FL',
  'Miami, FL',
  'Tampa, FL',
  'Atlanta, GA',
  'Madison, WI'
]

export default function RoamingPresenceWidget() {
  const { user } = useUserRole()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Local State
  const [roamingCities, setRoamingCities] = useState<string[]>([])
  const [newCityInput, setNewCityInput] = useState('')
  const [isRoamingActive, setIsRoamingActive] = useState(false)
  const [currentLiveCity, setCurrentLiveCity] = useState('')
  const [activeUntilDate, setActiveUntilDate] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    loadProfile(user.uid)
  }, [user?.uid])

  const loadProfile = async (uid: string) => {
    try {
      const fetched = await getProfileById(uid)
      if (fetched) {
        setProfile(fetched)
        const rawRoaming = fetched.active_roaming_cities || fetched.activeRoamingCities || []
        setRoamingCities(rawRoaming)

        const liveLoc = fetched.current_live_location || fetched.currentLiveLocation
        if (liveLoc && liveLoc.cityState) {
          setIsRoamingActive(true)
          setCurrentLiveCity(liveLoc.cityState)
          setActiveUntilDate(liveLoc.activeUntil || '')
        }
      }
    } catch (err) {
      console.error('Error loading participant profile for roaming presence:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCity = (city: string) => {
    const trimmed = city.trim()
    if (!trimmed || roamingCities.includes(trimmed)) return
    setRoamingCities(prev => [...prev, trimmed])
    setNewCityInput('')
  }

  const handleRemoveCity = (city: string) => {
    setRoamingCities(prev => prev.filter(c => c !== city))
  }

  const handleSavePresence = async () => {
    if (!user?.uid) return

    setSaving(true)
    try {
      let liveLoc: CurrentLiveLocation | undefined = undefined
      if (isRoamingActive && currentLiveCity.trim()) {
        liveLoc = {
          cityState: currentLiveCity.trim(),
          activeUntil: activeUntilDate || undefined,
          updatedAt: new Date().toISOString()
        }
      }

      await updateParticipantRoamingPresence(user.uid, roamingCities, liveLoc)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving roaming presence:', err)
      alert('Failed to update roaming presence.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-xs text-gray-400">Loading roaming presence...</div>
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-purple-950/40 rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Multi-City Roaming & Active Presence</span>
          </div>
          <h3 className="text-xl font-bold text-white">Broadcast Your Regional Availability</h3>
          <p className="text-xs text-gray-300 mt-1">
            Let host ensemble directors know when you are temporarily active or roaming in another regional node.
          </p>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Presence Synced
          </span>
        )}
      </div>

      {/* Temporary Active Roaming Broadcast Toggle */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-white block">Active Temporary Presence Broadcast</span>
            <span className="text-[11px] text-gray-400">Currently residing or performing temporarily in a secondary regional node</span>
          </div>
          <button
            type="button"
            onClick={() => setIsRoamingActive(!isRoamingActive)}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
              isRoamingActive ? 'bg-purple-600 justify-end' : 'bg-gray-700 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {isRoamingActive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-3 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Current Temporary Location</label>
                <input
                  type="text"
                  value={currentLiveCity}
                  onChange={(e) => setCurrentLiveCity(e.target.value)}
                  placeholder="e.g. Atlanta, GA or Tampa, FL"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Active Until Date (Optional)</label>
                <input
                  type="date"
                  value={activeUntilDate}
                  onChange={(e) => setActiveUntilDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Secondary Active Roaming Cities List */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
          Secondary Roaming Cities & Regional Travel Corridor
        </label>

        {/* Selected Roaming Tags */}
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {roamingCities.map((city) => (
            <span key={city} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-400 text-xs font-semibold">
              <MapPin className="w-3 h-3 text-purple-300" />
              <span>{city}</span>
              <button type="button" onClick={() => handleRemoveCity(city)} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {roamingCities.length === 0 && (
            <span className="text-xs text-gray-500 italic">No secondary roaming cities selected yet.</span>
          )}
        </div>

        {/* Add Custom City Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newCityInput}
            onChange={(e) => setNewCityInput(e.target.value)}
            placeholder="Add secondary city (e.g. Chicago, IL)..."
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCity(newCityInput)
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleAddCity(newCityInput)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Add
          </button>
        </div>

        {/* Popular Regional Node Shortcuts */}
        <div className="pt-2">
          <span className="text-[10px] text-gray-400 block mb-1.5 font-semibold">Quick Add Regional Nodes:</span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_REGIONAL_NODES.map((nodeCity) => (
              <button
                key={nodeCity}
                type="button"
                onClick={() => handleAddCity(nodeCity)}
                disabled={roamingCities.includes(nodeCity)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] text-gray-300 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-white/5"
              >
                + {nodeCity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-3 border-t border-white/10">
        <button
          type="button"
          onClick={handleSavePresence}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? 'Syncing Presence...' : 'Save Roaming Presence'}
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
