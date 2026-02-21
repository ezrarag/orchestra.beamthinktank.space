import type { CommitmentSummary, OpenCallSummary, SessionSummary } from '@/lib/types/portal'

const upcomingSessions: SessionSummary[] = [
  {
    id: 'sess-01',
    title: 'String Section Tracking',
    date: '2026-02-25 18:00',
    location: 'BEAM Studio A',
    type: 'Recording',
  },
  {
    id: 'sess-02',
    title: 'Chamber Rehearsal Capture',
    date: '2026-03-02 17:30',
    location: 'Downtown Hall',
    type: 'Workshop',
  },
]

const commitments: CommitmentSummary[] = [
  {
    id: 'commit-01',
    title: 'Session Call: Strings + Piano',
    time: 'Wed, Feb 25 · 6:00 PM',
    location: 'BEAM Studio A',
  },
  {
    id: 'commit-02',
    title: 'Dress Rehearsal',
    time: 'Sat, Feb 28 · 10:00 AM',
    location: 'Community Arts Center',
  },
]

const openCalls: OpenCallSummary[] = [
  {
    id: 'call-01',
    title: 'Paid Recording Block: Brass Section',
    details: '4-hour session for regional collaboration showcase.',
    paid: true,
  },
  {
    id: 'call-02',
    title: 'Volunteer Outreach Ensemble',
    details: 'Community event set with chamber-sized instrumentation.',
    paid: false,
  },
]

export async function fetchUpcomingSessions(_ngo: string): Promise<SessionSummary[]> {
  return upcomingSessions
}

export async function fetchCommitments(_ngo: string, _userId?: string): Promise<CommitmentSummary[]> {
  return commitments
}

export async function fetchOpenCalls(_ngo: string): Promise<OpenCallSummary[]> {
  return openCalls
}
