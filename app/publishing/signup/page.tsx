'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload } from 'lucide-react'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'

const roleOptions = [
  { id: 'dancer', label: 'Dancer' },
  { id: 'choreographer', label: 'Choreographer' },
  { id: 'videographer', label: 'Videographer' },
  { id: 'legal', label: 'Legal' },
  { id: 'composer_arranger', label: 'Composer/Arranger' },
  { id: 'producer', label: 'Producer' },
  { id: 'other', label: 'Other' },
] as const

const durationOptions = [
  { id: '1_week', label: '1 week' },
  { id: '2_weeks', label: '2 weeks' },
  { id: '1_month', label: '1 month' },
  { id: 'ongoing', label: 'Ongoing' },
] as const

type RoleId = (typeof roleOptions)[number]['id']
type DurationId = (typeof durationOptions)[number]['id']

export default function PublishingSignupPage() {
  const router = useRouter()
  const { user, loading } = useUserRole()
  const [name, setName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<RoleId[]>([])
  const [duration, setDuration] = useState<DurationId | ''>('')
  const [availabilityDate, setAvailabilityDate] = useState('')
  const [availabilityTime, setAvailabilityTime] = useState('')
  const [availabilityNotes, setAvailabilityNotes] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [materials, setMaterials] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadName = async () => {
      if (!user) return
      if (user.displayName && mounted) {
        setName(user.displayName)
        return
      }
      if (!db) return

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (!mounted) return
        const userData = userDoc.data() as Record<string, unknown> | undefined
        const firestoreName = typeof userData?.name === 'string' ? userData.name : ''
        if (firestoreName) {
          setName(firestoreName)
        }
      } catch (loadError) {
        console.error('Error loading profile name:', loadError)
      }
    }

    loadName()

    return () => {
      mounted = false
    }
  }, [user])

  const selectedRoleLabels = useMemo(() => {
    return roleOptions.filter((role) => selectedRoles.includes(role.id)).map((role) => role.label)
  }, [selectedRoles])

  const handleRoleToggle = (roleId: RoleId) => {
    setSelectedRoles((prev) => (prev.includes(roleId) ? prev.filter((item) => item !== roleId) : [...prev, roleId]))
  }

  const handleMaterialSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const allowed = files.filter((file) => file.type.startsWith('audio/') || file.type === 'application/pdf')
    setMaterials(allowed)
  }

  const validateForm = () => {
    if (!name.trim()) {
      return 'Name is required.'
    }
    if (selectedRoles.length === 0) {
      return 'Select at least one role.'
    }
    if (!duration) {
      return 'Select your desired involvement duration.'
    }
    if (!availabilityDate && !availabilityTime && !availabilityNotes.trim()) {
      return 'Provide availability details for rehearsals/performances.'
    }
    if (!projectDescription.trim()) {
      return 'Project description is required.'
    }
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!user) {
      setError('Please sign in to submit a publishing application.')
      return
    }
    if (!db || !storage) {
      setError('Publishing signup service is not initialized.')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const uploadedMaterials: Array<{
        fileName: string
        contentType: string
        storagePath: string
        url: string
      }> = []

      for (const file of materials) {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `publishing-applications/${user.uid}/${timestamp}_${safeName}`
        const storageRef = ref(storage, storagePath)

        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)

        uploadedMaterials.push({
          fileName: file.name,
          contentType: file.type,
          storagePath,
          url,
        })
      }

      await addDoc(collection(db, 'publishingApplications'), {
        userId: user.uid,
        name: name.trim(),
        roles: selectedRoles,
        roleLabels: selectedRoleLabels,
        duration,
        availability: {
          date: availabilityDate || null,
          time: availabilityTime || null,
          notes: availabilityNotes.trim() || null,
        },
        uploadedMaterials,
        description: projectDescription.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      router.push('/dashboard')
      router.refresh()
    } catch (submitError) {
      console.error('Error submitting publishing application:', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit publishing application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/80">Loading publishing sign up...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold">Publishing Sign Up</h1>
          <p className="mt-3 text-white/80">Please sign in to join a publishing project.</p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-black hover:bg-[#E5C86A]"
            >
              Sign In
            </Link>
            <Link
              href="/viewer"
              className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              Back to Publishing Overview
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/home" className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#D4AF37]">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h1 className="text-3xl font-bold">Publishing Project Sign Up</h1>
          <p className="mt-3 text-white/80">
            Submit your role interest, availability, and materials to join publishing collaborations.
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                placeholder="Your full name"
              />
            </label>

            <div>
              <p className="mb-2 text-sm text-white/80">Role Selection (choose one or more)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="h-4 w-4"
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Desired Involvement Duration</span>
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value as DurationId)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
              >
                <option value="">Select duration</option>
                {durationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Availability Date</span>
                <input
                  type="date"
                  value={availabilityDate}
                  onChange={(event) => setAvailabilityDate(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-white/80">Availability Time</span>
                <input
                  type="time"
                  value={availabilityTime}
                  onChange={(event) => setAvailabilityTime(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Availability Notes</span>
              <input
                value={availabilityNotes}
                onChange={(event) => setAvailabilityNotes(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                placeholder="Days, windows, and constraints for rehearsals/performances"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Upload Materials (Audio/PDF)</span>
              <div className="rounded-lg border border-dashed border-white/25 bg-black/20 p-4">
                <input type="file" multiple accept="audio/*,.pdf,application/pdf" onChange={handleMaterialSelection} className="w-full" />
                <p className="mt-2 text-xs text-white/60">
                  Accepted formats: audio files and PDF documents.
                </p>
                {materials.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-white/80">
                    {materials.map((file) => (
                      <li key={`${file.name}-${file.size}`} className="flex items-center gap-2">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{file.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Project Description</span>
              <textarea
                rows={5}
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                placeholder="Describe your project goals, the materials you want to contribute, and support needed."
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-5 py-3 font-semibold text-black hover:bg-[#E5C86A] disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/viewer"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10"
              >
                Publishing Overview
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
