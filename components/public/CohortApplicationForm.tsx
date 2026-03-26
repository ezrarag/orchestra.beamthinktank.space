'use client'

import { FormEvent, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const DISCIPLINE_OPTIONS = [
  'strings',
  'voice',
  'winds',
  'brass',
  'percussion',
  'composition',
  'film/media',
  'other',
] as const

const STUDENT_STATUS_OPTIONS = [
  'UWM graduate',
  'UWM undergraduate',
  'other university',
  'community musician',
] as const

const AVAILABILITY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const ROLE_PREFERENCE_OPTIONS = [
  'Performer at school visits',
  'Audition coach',
  'Prep mentor',
  'Logistics/admin',
] as const

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export default function CohortApplicationForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [discipline, setDiscipline] = useState<string>(DISCIPLINE_OPTIONS[0])
  const [studentStatus, setStudentStatus] = useState<string>(STUDENT_STATUS_OPTIONS[0])
  const [availability, setAvailability] = useState<string[]>([])
  const [rolePreferences, setRolePreferences] = useState<string[]>([])
  const [semesterCommitment, setSemesterCommitment] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!db) {
      setError('Firestore is not initialized.')
      return
    }

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    if (availability.length === 0) {
      setError('Choose at least one day of availability.')
      return
    }

    if (rolePreferences.length === 0) {
      setError('Choose at least one role preference.')
      return
    }

    if (!semesterCommitment) {
      setError('You must confirm the semester commitment to continue.')
      return
    }

    setSubmitting(true)

    try {
      await addDoc(collection(db, 'cohortApplications'), {
        ngo: 'orchestra',
        name: name.trim(),
        email: email.trim(),
        discipline,
        studentStatus,
        availability,
        rolePreferences,
        semesterCommitment,
        notes: notes.trim(),
        status: 'pending',
        submittedAt: serverTimestamp(),
      })

      setSubmitted(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit your cohort application.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-3xl rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6 text-emerald-100 sm:p-8">
        <p className="text-sm uppercase tracking-[0.18em] text-emerald-200/80">Application Received</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-white">You&apos;re in.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/90">
          We&apos;ll follow up within 48 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6 sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-white/72">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/72">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/72">Instrument / discipline</span>
            <select
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
            >
              {DISCIPLINE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/72">Current student status</span>
            <select
              value={studentStatus}
              onChange={(event) => setStudentStatus(event.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
            >
              {STUDENT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm text-white/72">Anything you want us to know?</span>
          <textarea
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
          />
        </label>
      </section>

      <section className="space-y-5">
        <div className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6">
          <p className="text-sm font-medium text-white">Availability</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {AVAILABILITY_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={availability.includes(option)}
                  onChange={() => setAvailability((current) => toggleValue(current, option))}
                  className="h-4 w-4"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6">
          <p className="text-sm font-medium text-white">Role preference</p>
          <div className="mt-4 space-y-3">
            {ROLE_PREFERENCE_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={rolePreferences.includes(option)}
                  onChange={() => setRolePreferences((current) => toggleValue(current, option))}
                  className="h-4 w-4"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/12 bg-white/[0.03] p-6">
          <label className="flex items-start gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={semesterCommitment}
              onChange={(event) => setSemesterCommitment(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>I commit to at least one visit per week for a full semester</span>
          </label>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit Cohort Interest'}
          </button>
        </div>
      </section>
    </form>
  )
}
