import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { normalizeEmail } from '@/lib/participantIdentity'

export interface EventPlayed {
  id: string
  title: string
  repertoire: string
  role: string
  venue: string
  cityState: string
  date: string
  type: 'Full Symphony' | 'Chamber Residency' | 'Sectional & Workshop' | 'Gala Showcase' | 'Tour'
  usdStipend: number
  beamCoinsEarned: number
  status: 'Played' | 'Confirmed' | 'Completed' | 'Scheduled'
}

export interface ParticipantDemographics {
  fullName: string
  email: string
  primaryRole: string
  originProject: string
  primaryInstrument: string
  secondaryInstruments?: string[]
  homeHub: string
  willingnessToTravel: boolean
  ethnicity: string
  pronouns: string
  educationBackground: string
  culturalCapitalNotes: string
  uncompensatedRehearsalHours: number
  beamCoinBalance: number
  usdTotalEarned: number
  headshotUrl?: string
}

export interface OrchestraCrossSiteRecordPayload {
  name: string
  email: string
  discipline: string
  subdomainSource: 'orchestra'
  location: string
  educationHistory: string
  culturalCapitalNotes: string
  uncompensatedRehearsalHours: number
  orchestraRecord: {
    project: string
    instrument: string
    status: string
    headshotUrl?: string
    notes?: string
  }
  demographics: ParticipantDemographics
  eventsPlayed: EventPlayed[]
}

// Pre-populated completed profile for ezra.haugabrooks@gmail.com (originated in Black Diaspora Orchestra / BDSO)
export const DEFAULT_EZRA_PROFILE: ParticipantDemographics = {
  fullName: 'Ezra Haugabrooks',
  email: 'ezra.haugabrooks@gmail.com',
  primaryRole: 'BEAM Participant Musician & BDSO Community Lead',
  originProject: 'Black Diaspora Orchestra (BDSO)',
  primaryInstrument: 'Cello',
  secondaryInstruments: ['Violoncello', 'Chamber Ensemble Leadership'],
  homeHub: 'Milwaukee, WI / Chicago, IL',
  willingnessToTravel: true,
  ethnicity: 'Black Diaspora / African-American Artist',
  pronouns: 'He / Him',
  educationBackground: 'Black Diaspora Symphony Orchestra Core Roster & Repertoire Specialist (Bonds, Still, Price)',
  culturalCapitalNotes: 'Cellist & Sectional Leader for BDSO annual concert series, rehearsal intensives, and community youth mentorship.',
  uncompensatedRehearsalHours: 24,
  beamCoinBalance: 48,
  usdTotalEarned: 1485,
  headshotUrl: 'https://link.storjshare.io/raw/jv56mcbz6f3ebhsnssa5tqlncpfa/orchestabeam/Images%2FBlack%20Diaspora%20Symphony%2F2025%20Annual%20Concert%2FMusican%20photos/IMG_9498.jpg'
}

export const DEFAULT_EZRA_EVENTS: EventPlayed[] = [
  {
    id: 'bdo-001',
    title: 'Black Diaspora Symphony Orchestra Inaugural Masterworks',
    repertoire: 'Margaret Bonds – Montgomery Variations',
    role: 'Principal Cello',
    venue: 'Bradley Symphony Center',
    cityState: 'Milwaukee, WI',
    date: '2025-11-15',
    type: 'Full Symphony',
    usdStipend: 200,
    beamCoinsEarned: 10,
    status: 'Played'
  },
  {
    id: 'bdo-002',
    title: 'BDSO Chamber Music Residency & Masterclass',
    repertoire: 'R. Schumann – Adagio and Allegro, Op. 70 & W. G. Still – Spiritual Suite',
    role: 'Lead Cellist / Chamber Soloist',
    venue: 'Concord Performing Arts Hub',
    cityState: 'Concord, NC',
    date: '2025-12-05',
    type: 'Chamber Residency',
    usdStipend: 120,
    beamCoinsEarned: 4,
    status: 'Played'
  },
  {
    id: 'bdo-003',
    title: 'Sectional Intensive & Youth Mentorship Workshop',
    repertoire: 'Florence Price – Symphony No. 1 in E Minor',
    role: 'Section Leader & Mentor',
    venue: 'Chicago Cultural Center',
    cityState: 'Chicago, IL',
    date: '2026-01-20',
    type: 'Sectional & Workshop',
    usdStipend: 165,
    beamCoinsEarned: 8,
    status: 'Played'
  },
  {
    id: 'bdo-004',
    title: 'BEAM Winter Gala & Composers Showcase',
    repertoire: 'Black Diaspora Living Composers Suite',
    role: 'Principal Cello',
    venue: 'Dr. Phillips Center for the Performing Arts',
    cityState: 'Orlando, FL',
    date: '2026-02-14',
    type: 'Gala Showcase',
    usdStipend: 250,
    beamCoinsEarned: 12,
    status: 'Played'
  },
  {
    id: 'bdo-005',
    title: 'Spring 2026 BDSO Multi-City Tour',
    repertoire: 'Margaret Bonds & Duke Ellington Symphonic Suite',
    role: 'Principal Cello',
    venue: 'Miller High Life Theatre',
    cityState: 'Milwaukee, WI',
    date: '2026-04-18',
    type: 'Tour',
    usdStipend: 300,
    beamCoinsEarned: 14,
    status: 'Scheduled'
  }
]

export async function fetchParticipantProfile(email: string): Promise<ParticipantDemographics> {
  const normEmail = normalizeEmail(email)
  if (normEmail === 'ezra.haugabrooks@gmail.com') {
    if (db) {
      try {
        const participantId = `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`
        const snap = await getDoc(doc(db, 'participantProfiles', participantId))
        if (snap.exists()) {
          const data = snap.data()
          return {
            ...DEFAULT_EZRA_PROFILE,
            fullName: data.fullName || DEFAULT_EZRA_PROFILE.fullName,
            primaryInstrument: data.primaryInstrument || data.instruments?.[0] || DEFAULT_EZRA_PROFILE.primaryInstrument,
            homeHub: data.homeHub || DEFAULT_EZRA_PROFILE.homeHub,
            ethnicity: data.ethnicity || DEFAULT_EZRA_PROFILE.ethnicity,
            pronouns: data.pronouns || DEFAULT_EZRA_PROFILE.pronouns,
            culturalCapitalNotes: data.culturalCapitalNotes || DEFAULT_EZRA_PROFILE.culturalCapitalNotes,
            educationBackground: data.educationBackground || DEFAULT_EZRA_PROFILE.educationBackground,
            uncompensatedRehearsalHours: typeof data.uncompensatedRehearsalHours === 'number' ? data.uncompensatedRehearsalHours : DEFAULT_EZRA_PROFILE.uncompensatedRehearsalHours
          }
        }
      } catch (err) {
        console.warn('Could not read Firestore participant profile, using default:', err)
      }
    }
    return DEFAULT_EZRA_PROFILE
  }

  // Fallback profile for other users
  return {
    fullName: email.split('@')[0],
    email: normEmail,
    primaryRole: 'BEAM Participant Musician',
    originProject: 'BEAM Orchestra Network',
    primaryInstrument: 'Strings',
    homeHub: 'Global Hub',
    willingnessToTravel: true,
    ethnicity: 'BEAM Artist',
    pronouns: 'They / Them',
    educationBackground: 'BEAM Musician Participant',
    culturalCapitalNotes: 'Registered BEAM participant.',
    uncompensatedRehearsalHours: 0,
    beamCoinBalance: 10,
    usdTotalEarned: 0
  }
}

export async function saveParticipantProfile(email: string, updates: Partial<ParticipantDemographics>): Promise<void> {
  const normEmail = normalizeEmail(email)
  if (!db) return

  const participantId = `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`
  await setDoc(
    doc(db, 'participantProfiles', participantId),
    {
      ...updates,
      primaryEmail: normEmail,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  )
}

export async function fetchCrossSiteRecordPayload(email: string): Promise<OrchestraCrossSiteRecordPayload> {
  const profile = await fetchParticipantProfile(email)
  const isEzra = normalizeEmail(email) === 'ezra.haugabrooks@gmail.com'
  const events = isEzra ? DEFAULT_EZRA_EVENTS : []

  return {
    name: profile.fullName,
    email: profile.email,
    discipline: `${profile.primaryInstrument} Performance / Orchestra Member`,
    subdomainSource: 'orchestra',
    location: profile.homeHub,
    educationHistory: profile.educationBackground,
    culturalCapitalNotes: profile.culturalCapitalNotes,
    uncompensatedRehearsalHours: profile.uncompensatedRehearsalHours,
    orchestraRecord: {
      project: events[0]?.title || 'Black Diaspora Symphony Orchestra - 2025 Annual Concert',
      instrument: profile.primaryInstrument,
      status: 'Confirmed',
      headshotUrl: profile.headshotUrl,
      notes: `${profile.primaryInstrument} playing with ${profile.originProject}.`
    },
    demographics: profile,
    eventsPlayed: events
  }
}
