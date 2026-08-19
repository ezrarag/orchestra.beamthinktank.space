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
  usdTotalEarned: 1485
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

export async function fetchParticipantProfile(
  email: string,
  userUid?: string,
  googleName?: string | null,
  googlePhoto?: string | null
): Promise<ParticipantDemographics> {
  const normEmail = normalizeEmail(email)
  const participantId = userUid ? `participant_role_${userUid}` : `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`

  if (db) {
    try {
      // First try by UID-based doc id, then fallback to email-based doc id
      let snap = await getDoc(doc(db, 'participantProfiles', participantId))
      if (!snap.exists()) {
        const altId = `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`
        snap = await getDoc(doc(db, 'participantProfiles', altId))
      }

      if (snap.exists()) {
        const data = snap.data()
        const isEzra = normEmail === 'ezra.haugabrooks@gmail.com'
        const defaultBase = isEzra ? DEFAULT_EZRA_PROFILE : {}

        return {
          fullName: data.fullName || googleName || data.name || (isEzra ? DEFAULT_EZRA_PROFILE.fullName : normEmail.split('@')[0]),
          email: normEmail,
          primaryRole: data.primaryRole || (isEzra ? DEFAULT_EZRA_PROFILE.primaryRole : 'BEAM Participant Musician'),
          originProject: data.originProject || (isEzra ? DEFAULT_EZRA_PROFILE.originProject : 'BEAM Orchestra Network'),
          primaryInstrument: data.primaryInstrument || (isEzra ? DEFAULT_EZRA_PROFILE.primaryInstrument : 'Strings / Musician'),
          homeHub: data.homeHub || (isEzra ? DEFAULT_EZRA_PROFILE.homeHub : 'Member Hub'),
          willingnessToTravel: typeof data.willingnessToTravel === 'boolean' ? data.willingnessToTravel : true,
          ethnicity: data.ethnicity || (isEzra ? DEFAULT_EZRA_PROFILE.ethnicity : 'BEAM Artist'),
          pronouns: data.pronouns || (isEzra ? DEFAULT_EZRA_PROFILE.pronouns : 'They / Them'),
          educationBackground: data.educationBackground || (isEzra ? DEFAULT_EZRA_PROFILE.educationBackground : 'BEAM Musician Participant'),
          culturalCapitalNotes: data.culturalCapitalNotes || (isEzra ? DEFAULT_EZRA_PROFILE.culturalCapitalNotes : 'Welcome to BEAM Orchestra! Click Edit Profile to complete your musician bio, contact card, and repertoire specialties.'),
          uncompensatedRehearsalHours: typeof data.uncompensatedRehearsalHours === 'number' ? data.uncompensatedRehearsalHours : (isEzra ? 24 : 0),
          beamCoinBalance: typeof data.beamCoinBalance === 'number' ? data.beamCoinBalance : (isEzra ? 48 : 0),
          usdTotalEarned: typeof data.usdTotalEarned === 'number' ? data.usdTotalEarned : (isEzra ? 1485 : 0),
          headshotUrl: data.headshotUrl || googlePhoto || (isEzra ? DEFAULT_EZRA_PROFILE.headshotUrl : '')
        }
      }
    } catch (err) {
      console.warn('Could not read Firestore participant profile, creating default:', err)
    }
  }

  if (normEmail === 'ezra.haugabrooks@gmail.com') {
    return DEFAULT_EZRA_PROFILE
  }

  // Clean brand-new user profile (0 stats, clean empty state)
  return {
    fullName: googleName || normEmail.split('@')[0],
    email: normEmail,
    primaryRole: 'BEAM Participant Musician',
    originProject: 'BEAM Orchestra Network',
    primaryInstrument: 'Strings / Musician',
    homeHub: 'Member Hub',
    willingnessToTravel: true,
    ethnicity: 'BEAM Artist',
    pronouns: 'They / Them',
    educationBackground: 'BEAM Musician Participant',
    culturalCapitalNotes: 'Welcome to BEAM Orchestra! Click Edit Profile to complete your musician bio, contact card, and repertoire specialties.',
    uncompensatedRehearsalHours: 0,
    beamCoinBalance: 0,
    usdTotalEarned: 0,
    headshotUrl: googlePhoto || ''
  }
}

export async function saveParticipantProfile(
  email: string,
  updates: Partial<ParticipantDemographics>,
  userUid?: string
): Promise<void> {
  const normEmail = normalizeEmail(email)
  if (!db) return

  const primaryId = userUid ? `participant_role_${userUid}` : `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`
  const altId = `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`

  const payload = {
    ...updates,
    primaryEmail: normEmail,
    authUid: userUid || null,
    updatedAt: serverTimestamp()
  }

  await setDoc(doc(db, 'participantProfiles', primaryId), payload, { merge: true })
  if (userUid && primaryId !== altId) {
    await setDoc(doc(db, 'participantProfiles', altId), payload, { merge: true })
  }
}

export async function ensureParticipantProfileExists(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }): Promise<void> {
  if (!db || !user.email) return

  const normEmail = normalizeEmail(user.email)
  const primaryId = `participant_role_${user.uid}`
  const altId = `participant-${normEmail.replace(/[^a-z0-9]+/g, '-')}`

  try {
    const snap = await getDoc(doc(db, 'participantProfiles', primaryId))
    if (!snap.exists()) {
      const altSnap = await getDoc(doc(db, 'participantProfiles', altId))
      if (!altSnap.exists()) {
        const isEzra = normEmail === 'ezra.haugabrooks@gmail.com'
        const initialProfile: Partial<ParticipantDemographics> = isEzra ? DEFAULT_EZRA_PROFILE : {
          fullName: user.displayName || normEmail.split('@')[0],
          email: normEmail,
          primaryRole: 'BEAM Participant Musician',
          originProject: 'BEAM Orchestra Network',
          primaryInstrument: 'Strings / Musician',
          homeHub: 'Member Hub',
          willingnessToTravel: true,
          ethnicity: 'BEAM Artist',
          pronouns: 'They / Them',
          educationBackground: 'BEAM Musician Participant',
          culturalCapitalNotes: 'Welcome to BEAM Orchestra! Click Edit Profile to complete your musician bio, contact card, and repertoire specialties.',
          uncompensatedRehearsalHours: 0,
          beamCoinBalance: 0,
          usdTotalEarned: 0,
          headshotUrl: user.photoURL || ''
        }
        await saveParticipantProfile(normEmail, initialProfile, user.uid)
      }
    }
  } catch (err) {
    console.warn('Error ensuring participant profile exists:', err)
  }
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
