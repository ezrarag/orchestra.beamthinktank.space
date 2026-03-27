'use client'

import Link from 'next/link'
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import {
  claimExistingContributions,
  markContributionClaimed,
  writeCachedParticipantRole,
  writeCachedParticipantRoles,
} from '@/lib/participantOnboarding'
import {
  mergeParticipantRoles,
  normalizeEmail,
  normalizeEmailList,
  parseEmailList,
  resolvePrimaryParticipantRole,
} from '@/lib/participantIdentity'

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

const COHORT_STEPS = [
  {
    label: 'Profile',
    description: 'Name, emails, discipline, and student status.',
  },
  {
    label: 'Participation',
    description: 'Availability, role interest, and notes.',
  },
  {
    label: 'Confirm',
    description: 'Review details and finish the cohort request.',
  },
] as const

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-sm text-white/85">{value}</p>
    </div>
  )
}

export default function CohortApplicationForm() {
  const statusFieldRef = useRef<HTMLDivElement | null>(null)
  const { user } = useUserRole({ allowAdminBypass: false })

  const [currentStep, setCurrentStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otherEmailsInput, setOtherEmailsInput] = useState('')
  const [discipline, setDiscipline] = useState<string>(DISCIPLINE_OPTIONS[0])
  const [studentStatus, setStudentStatus] = useState<string>(STUDENT_STATUS_OPTIONS[0])
  const [studentStatusQuery, setStudentStatusQuery] = useState<string>(STUDENT_STATUS_OPTIONS[0])
  const [studentStatusMenuOpen, setStudentStatusMenuOpen] = useState(false)
  const [availability, setAvailability] = useState<string[]>([])
  const [rolePreferences, setRolePreferences] = useState<string[]>([])
  const [semesterCommitment, setSemesterCommitment] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [dashboardReady, setDashboardReady] = useState(false)

  useEffect(() => {
    if (!user?.email || email.trim()) return
    setEmail(user.email)
  }, [email, user?.email])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!statusFieldRef.current) return
      if (statusFieldRef.current.contains(event.target as Node)) return
      setStudentStatusMenuOpen(false)
      setStudentStatusQuery((current) => current.trim() || studentStatus)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [studentStatus])

  const filteredStudentStatuses = useMemo(() => {
    const query = studentStatusQuery.trim().toLowerCase()
    if (!query) return [...STUDENT_STATUS_OPTIONS]

    return STUDENT_STATUS_OPTIONS.filter((option) => option.toLowerCase().includes(query))
  }, [studentStatusQuery])

  const canCreateStudentStatus = useMemo(() => {
    const trimmed = studentStatusQuery.trim()
    if (!trimmed) return false
    return !STUDENT_STATUS_OPTIONS.some((option) => option.toLowerCase() === trimmed.toLowerCase())
  }, [studentStatusQuery])

  const normalizedPrimaryEmail = normalizeEmail(email)
  const aliasEmails = useMemo(
    () => parseEmailList(otherEmailsInput).filter((item) => item !== normalizedPrimaryEmail),
    [normalizedPrimaryEmail, otherEmailsInput],
  )
  const emailLookup = useMemo(
    () => normalizeEmailList([normalizedPrimaryEmail, ...aliasEmails, user?.email ?? null]),
    [aliasEmails, normalizedPrimaryEmail, user?.email],
  )
  const resolvedStudentStatus = studentStatusQuery.trim() || studentStatus

  const selectStudentStatus = (value: string) => {
    const nextValue = value.trim()
    if (!nextValue) return

    setStudentStatus(nextValue)
    setStudentStatusQuery(nextValue)
    setStudentStatusMenuOpen(false)
  }

  const handleStudentStatusKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const nextValue = filteredStudentStatuses[0] ?? studentStatusQuery
      selectStudentStatus(nextValue)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setStudentStatusMenuOpen(false)
      setStudentStatusQuery(studentStatus)
    }
  }

  const validateProfileStep = () => {
    if (!name.trim() || !normalizedPrimaryEmail) {
      setError('Name and email are required.')
      return false
    }

    if (!isValidEmail(normalizedPrimaryEmail)) {
      setError('Enter a valid email address.')
      return false
    }

    if (aliasEmails.some((alias) => !isValidEmail(alias))) {
      setError('Enter valid additional emails separated by commas.')
      return false
    }

    if (!resolvedStudentStatus) {
      setError('Choose or enter your current student status.')
      return false
    }

    return true
  }

  const validateParticipationStep = () => {
    if (availability.length === 0) {
      setError('Choose at least one day of availability.')
      return false
    }

    if (rolePreferences.length === 0) {
      setError('Choose at least one role preference.')
      return false
    }

    return true
  }

  const validateConfirmStep = () => {
    if (!semesterCommitment) {
      setError('You must confirm the semester commitment to continue.')
      return false
    }

    return true
  }

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) return validateProfileStep()
    if (stepIndex === 1) return validateParticipationStep()
    return validateConfirmStep()
  }

  const handleNextStep = () => {
    setError(null)
    if (!validateStep(currentStep)) return
    setCurrentStep((step) => Math.min(step + 1, COHORT_STEPS.length - 1))
  }

  const handleBackStep = () => {
    setError(null)
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (currentStep < COHORT_STEPS.length - 1) {
      handleNextStep()
      return
    }

    if (!db) {
      setError('Firestore is not initialized.')
      return
    }

    if (!validateProfileStep() || !validateParticipationStep() || !validateConfirmStep()) {
      return
    }

    setSubmitting(true)

    try {
      await addDoc(collection(db, 'cohortApplications'), {
        ngo: 'orchestra',
        intent: 'recruit_mentor',
        name: name.trim(),
        email: normalizedPrimaryEmail,
        emailAliases: aliasEmails,
        emailLookup,
        discipline,
        studentStatus: resolvedStudentStatus,
        availability,
        rolePreferences,
        semesterCommitment,
        notes: notes.trim(),
        status: 'pending',
        submittedAt: serverTimestamp(),
        ...(user ? { submittedBy: user.uid } : {}),
      })

      if (user) {
        const membershipRef = doc(db, 'ngoMemberships', user.uid)
        const membershipSnap = await getDoc(membershipRef)
        const membershipData = membershipSnap.exists()
          ? (membershipSnap.data() as { ngo?: unknown; role?: unknown; roles?: unknown })
          : null
        const resolvedRoles = mergeParticipantRoles(membershipData, ['recruit_mentor'])
        const primaryRole = resolvePrimaryParticipantRole(resolvedRoles) ?? 'recruit_mentor'

        await setDoc(
          membershipRef,
          {
            ngo: 'orchestra',
            role: primaryRole,
            roles: resolvedRoles,
            updatedAt: serverTimestamp(),
            ...(membershipData?.ngo === 'orchestra' ? {} : { joinedAt: serverTimestamp() }),
          },
          { merge: true },
        )

        await claimExistingContributions(user.uid, emailLookup)
        markContributionClaimed(user.uid)
        writeCachedParticipantRole(user.uid, primaryRole)
        writeCachedParticipantRoles(user.uid, resolvedRoles)
        setDashboardReady(true)
      } else {
        setDashboardReady(false)
      }

      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your cohort application.')
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
        {dashboardReady ? (
          <div className="mt-6">
            <p className="text-sm text-emerald-50/90">
              Your recruit and mentor role is now attached to your shared participant account.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open Dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-emerald-50/90">
              Finish sign-in to attach this cohort interest to your shared BEAM dashboard. If you entered other BEAM emails
              above, those can now resolve into the same participant account.
            </p>
            <Link
              href="/join/confirm?intent=recruit_mentor"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Continue to Shared Dashboard
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {COHORT_STEPS.map((step, index) => {
            const active = index === currentStep
            const complete = index < currentStep

            return (
              <button
                key={step.label}
                type="button"
                onClick={() => {
                  if (index <= currentStep) {
                    setError(null)
                    setCurrentStep(index)
                  }
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? 'border-white/30 bg-white/[0.08]'
                    : complete
                      ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:border-[#D4AF37]/50'
                      : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      active || complete ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/58">{step.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[32px] border border-white/12 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
            Step {currentStep + 1} of {COHORT_STEPS.length}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">{COHORT_STEPS[currentStep].label}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66">{COHORT_STEPS[currentStep].description}</p>

          {currentStep === 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
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
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-white/72">Other emails you&apos;ve used with BEAM (optional)</span>
                <input
                  value={otherEmailsInput}
                  onChange={(event) => setOtherEmailsInput(event.target.value)}
                  placeholder="name@school.edu, name@gmail.com"
                  className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
                />
                <span className="mt-2 block text-xs leading-5 text-white/55">
                  Add any school or personal addresses you&apos;ve already used so this cohort path can attach to the same dashboard later.
                </span>
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
              <div className="block" ref={statusFieldRef}>
                <span className="mb-2 block text-sm text-white/72">Current student status</span>
                <div className="relative">
                  <input
                    value={studentStatusQuery}
                    onChange={(event) => {
                      setStudentStatusQuery(event.target.value)
                      setStudentStatusMenuOpen(true)
                    }}
                    onFocus={() => setStudentStatusMenuOpen(true)}
                    onKeyDown={handleStudentStatusKeyDown}
                    placeholder="Search or enter your status"
                    className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
                  />
                  {studentStatusMenuOpen ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[#111111] p-2 shadow-2xl">
                      {filteredStudentStatuses.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectStudentStatus(option)}
                          className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                            studentStatus === option ? 'bg-white/12 text-white' : 'text-white/78 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                      {canCreateStudentStatus ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectStudentStatus(studentStatusQuery)}
                          className="mt-1 flex w-full rounded-xl border border-dashed border-white/15 px-3 py-2 text-left text-sm text-[#F5D37A] transition hover:bg-white/10"
                        >
                          Create new: &quot;{studentStatusQuery.trim()}&quot;
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <span className="mt-2 block text-xs leading-5 text-white/55">
                  Type to search, press Enter to use what you typed, or pick an existing option.
                </span>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-[28px] border border-white/12 bg-black/20 p-5">
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

              <div className="rounded-[28px] border border-white/12 bg-black/20 p-5">
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

              <label className="block">
                <span className="mb-2 block text-sm text-white/72">Anything you want us to know?</span>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-white/28"
                />
              </label>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="mt-8 space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryRow label="Name" value={name.trim() || 'Not provided'} />
                <SummaryRow label="Primary Email" value={normalizedPrimaryEmail || 'Not provided'} />
                <SummaryRow label="Other Emails" value={aliasEmails.length > 0 ? aliasEmails.join(', ') : 'None added'} />
                <SummaryRow label="Discipline" value={discipline} />
                <SummaryRow label="Student Status" value={resolvedStudentStatus || 'Not provided'} />
                <SummaryRow label="Availability" value={availability.length > 0 ? availability.join(', ') : 'None selected'} />
                <SummaryRow label="Role Preference" value={rolePreferences.length > 0 ? rolePreferences.join(', ') : 'None selected'} />
                <SummaryRow label="Notes" value={notes.trim() || 'No additional notes'} />
              </div>

              <label className="flex items-start gap-3 rounded-[28px] border border-white/12 bg-black/20 p-5 text-sm text-white/82">
                <input
                  type="checkbox"
                  checked={semesterCommitment}
                  onChange={(event) => setSemesterCommitment(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I commit to at least one visit per week for a full semester</span>
              </label>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-5">
          {user ? (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Signed in as {user.email}. Submitting here will attach Recruit &amp; Mentor to your shared participant dashboard.
            </p>
          ) : (
            <p className="rounded-2xl border border-[#F5D37A]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#F8E8AE]">
              You can submit as a visitor, then finish sign-in afterward to connect this cohort interest to your shared dashboard.
            </p>
          )}

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs uppercase tracking-[0.16em] text-white/45">
              {COHORT_STEPS[currentStep].label}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="inline-flex items-center justify-center rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35"
                >
                  Back
                </button>
              ) : null}

              {currentStep < COHORT_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit Cohort Interest'}
                </button>
              )}
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}
