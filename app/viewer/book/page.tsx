'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Music2 } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { doc, getDoc } from 'firebase/firestore'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db } from '@/lib/firebase'
import { createBookingRequest } from '@/lib/api/bookings'

type ViewerCreditState = {
  current: number
  total: number
}

export default function ViewerBookingPage() {
  const router = useRouter()
  const { user, role, loading } = useUserRole()
  const isSubscriber = role === 'subscriber'
  const [submitting, setSubmitting] = useState(false)
  const [credits, setCredits] = useState<ViewerCreditState>({ current: 0, total: 0 })
  const [form, setForm] = useState({
    eventDate: '',
    location: '',
    instrumentation: '',
    notes: '',
    creditsToUse: 1,
  })

  useEffect(() => {
    let mounted = true

    const loadCredits = async () => {
      if (!user || !db) {
        if (mounted) setCredits({ current: 0, total: 0 })
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (!mounted) return
        const data = userDoc.data() as Record<string, unknown> | undefined

        const current =
          typeof data?.bookingCredits === 'number'
            ? data.bookingCredits
            : typeof data?.monthlyCredits === 'number'
              ? data.monthlyCredits
              : typeof data?.subscriberCredits === 'number'
                ? data.subscriberCredits
                : 0

        const total =
          typeof data?.monthlyCreditAllotment === 'number'
            ? data.monthlyCreditAllotment
            : typeof data?.monthlyCreditsAllotment === 'number'
              ? data.monthlyCreditsAllotment
              : typeof data?.monthlyCreditsTotal === 'number'
                ? data.monthlyCreditsTotal
                : current

        setCredits({ current, total })
      } catch (error) {
        console.error('Error loading viewer booking credits:', error)
        if (mounted) setCredits({ current: 0, total: 0 })
      }
    }

    loadCredits()

    return () => {
      mounted = false
    }
  }, [user])

  const creditsRemainingAfterSubmit = useMemo(() => {
    return Math.max(credits.current - form.creditsToUse, 0)
  }, [credits.current, form.creditsToUse])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      toast.error('Please sign in before submitting a booking request.')
      return
    }

    if (!isSubscriber) {
      toast.error('Subscriber account required to submit booking requests.')
      return
    }

    if (!form.eventDate || !form.instrumentation.trim() || !form.location.trim()) {
      toast.error('Date, location, and instrumentation are required.')
      return
    }

    if (!Number.isFinite(form.creditsToUse) || form.creditsToUse <= 0) {
      toast.error('Credits used must be greater than 0.')
      return
    }

    if (form.creditsToUse > credits.current) {
      toast.error('Credits used cannot exceed your remaining balance.')
      return
    }

    setSubmitting(true)

    try {
      const result = await createBookingRequest({
        date: form.eventDate,
        location: form.location.trim(),
        instrumentation: form.instrumentation.trim(),
        notes: form.notes.trim(),
        creditsToUse: form.creditsToUse,
      })

      setCredits((prev) => ({ ...prev, current: result.remainingCredits }))
      toast.success('Booking request submitted successfully.')
      router.push('/viewer?refreshCredits=1')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit booking request.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-3xl">
        <Link
          href="/viewer"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Viewer Area
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8"
        >
          <h1 className="mb-3 text-3xl font-bold">Book BEAM Talent</h1>
          <p className="mb-2 text-white/80">
            Submit event details and we will follow up with roster options and availability.
          </p>
          <p className="mb-6 text-sm text-[#F0D68A]">
            Remaining Credits: {credits.current}/{credits.total}
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-sm text-white/70">
                  <Calendar className="h-4 w-4" />
                  Preferred Date
                </span>
                <input
                  type="date"
                  required
                  value={form.eventDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-sm text-white/70">
                  <MapPin className="h-4 w-4" />
                  Location
                </span>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                  placeholder="City, venue, or virtual"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-sm text-white/70">
                <Music2 className="h-4 w-4" />
                Instrumentation Needed
              </span>
              <input
                required
                value={form.instrumentation}
                onChange={(e) => setForm((prev) => ({ ...prev, instrumentation: e.target.value }))}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                placeholder="Quartet, chamber ensemble, strings + piano, etc."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/70">Notes</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                placeholder="Program goals, repertoire, budget range, audience notes..."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/70">Credits To Use</span>
              <input
                type="number"
                min={1}
                max={credits.current || 1}
                step={1}
                value={form.creditsToUse}
                onChange={(e) => {
                  const nextValue = Number(e.target.value)
                  setForm((prev) => ({
                    ...prev,
                    creditsToUse: Number.isFinite(nextValue) ? nextValue : 1,
                  }))
                }}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#D4AF37]"
              />
              <p className="mt-1 text-xs text-white/60">
                After submission: {creditsRemainingAfterSubmit}/{credits.total} remaining
              </p>
            </label>

            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#D4AF37] px-5 py-3 font-bold text-black hover:bg-[#E5C86A] disabled:opacity-70"
            >
              {submitting ? 'Submitting...' : 'Submit Booking Request'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
