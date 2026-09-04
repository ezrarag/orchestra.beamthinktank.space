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

export interface MediaPortfolioItem {
  id: string
  title: string
  url: string
  category: 'Steinway Session' | 'Orchestral Performance' | 'Chamber Masterclass' | 'Solo Recital' | 'Rehearsal Footage' | 'Publishing Release'
  dateAdded?: string
  description?: string
  composer?: string
  thumbnailUrl?: string
  workId?: string
}

export interface CatalogWorkItem {
  id: string
  title: string
  url: string
  category: MediaPortfolioItem['category']
  composer?: string
  dateRecorded?: string
  description?: string
  thumbnailUrl?: string
  ensemble?: string
}

export const BEAM_CATALOG_WORKS: CatalogWorkItem[] = [
  {
    id: 'work-steinway-schumann-01',
    title: 'Schumann Adagio & Allegro — Steinway Gallery Orlando',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
    category: 'Steinway Session',
    composer: 'Robert Schumann',
    dateRecorded: '2025-12-05',
    description: 'Solo cello and Steinway grand recording at Steinway Gallery Orlando residency.',
    ensemble: 'BDSO Chamber Duo'
  },
  {
    id: 'work-bonds-rehearsal-508',
    title: 'Margaret Bonds Montgomery Variations — Rehearsal Cut (5:08 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=68f26fd3-60ed-465a-841b-71073d683034',
    category: 'Rehearsal Footage',
    composer: 'Margaret Bonds',
    dateRecorded: '2025-11-10',
    description: 'Rehearsal footage of Montgomery Variations sectional performance (5:08 PM session).',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-bonds-rehearsal-528',
    title: 'Margaret Bonds Montgomery Variations — Rehearsal Cut (5:28 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2028%20pm%20-%2011%2010%2025.mov?alt=media&token=cab69290-25d3-4c9b-9e06-f34ce1e67c9c',
    category: 'Rehearsal Footage',
    composer: 'Margaret Bonds',
    dateRecorded: '2025-11-10',
    description: 'Rehearsal footage of Montgomery Variations sectional performance (5:28 PM session).',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-bonds-rehearsal-540',
    title: 'Margaret Bonds Montgomery Variations — Full Tutti Run (5:40 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%FBonds%20-%205%2040%20pm%20-%2011%2010%2025.mov?alt=media&token=35402118-7f27-4cfd-bb7b-39bf9b150414',
    category: 'Rehearsal Footage',
    composer: 'Margaret Bonds',
    dateRecorded: '2025-11-10',
    description: 'Full orchestra tutti rehearsal run of Margaret Bonds Montgomery Variations.',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-bonds-rehearsal-605',
    title: 'Margaret Bonds Montgomery Variations — Rehearsal Cut (6:05 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%206%2005%20pm%20-%2011%2010%2025.mov?alt=media&token=774347b4-5d30-4cf1-8007-cda0243e95a6',
    category: 'Rehearsal Footage',
    composer: 'Margaret Bonds',
    dateRecorded: '2025-11-10',
    description: 'Evening rehearsal take for Margaret Bonds orchestral suite.',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-grieg-rehearsal-508',
    title: 'Grieg Peer Gynt Suite — Rehearsal Cut (5:08 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=7ae6ce2a-833f-4da4-849d-cc99c9aac768',
    category: 'Rehearsal Footage',
    composer: 'Edvard Grieg',
    dateRecorded: '2025-11-10',
    description: 'Orchestral rehearsal cut for Grieg Peer Gynt suite (5:08 PM session).',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-grieg-rehearsal-514',
    title: 'Grieg Peer Gynt Suite — Rehearsal Cut (5:14 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2014%20pm%20-%2011%2010%2025.mov?alt=media&token=17486778-436a-4c68-b5fe-ecf3a1302401',
    category: 'Rehearsal Footage',
    composer: 'Edvard Grieg',
    dateRecorded: '2025-11-10',
    description: 'Orchestral rehearsal cut for Grieg Peer Gynt suite (5:14 PM session).',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-ravel-rehearsal-649',
    title: 'Ravel Pavane for a Dead Princess — Rehearsal Cut (6:49 PM)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FRavel%20-%206%2049%20pm%20-%2011%2010%2025.mov?alt=media&token=1a893711-d08c-45bd-8963-1036d162731c',
    category: 'Rehearsal Footage',
    composer: 'Maurice Ravel',
    dateRecorded: '2025-11-10',
    description: 'Full string and wind section rehearsal take for Ravel Pavane.',
    ensemble: 'Black Diaspora Symphony Orchestra'
  },
  {
    id: 'work-brahms-sonata-mke',
    title: 'Brahms Sonata (Milwaukee Residency)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/viewer%2Fchamber%2F2025-milwaukee%2Fbrahms_sonata.mp4?alt=media',
    category: 'Chamber Masterclass',
    composer: 'Johannes Brahms',
    dateRecorded: '2025-12-05',
    description: 'Recorded live at UWM Chamber Series.',
    ensemble: 'BEAM Chamber Duo'
  },
  {
    id: 'work-schumann-sonata-mke',
    title: 'Schumann Sonata (Milwaukee Residency)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/viewer%2Fchamber%2F2025-milwaukee%2Fschumann_sonata.mp4?alt=media',
    category: 'Chamber Masterclass',
    composer: 'Robert Schumann',
    dateRecorded: '2025-12-05',
    description: 'Recorded live at UWM Chamber Series.',
    ensemble: 'BEAM Chamber Duo'
  },
  {
    id: 'work-pachelbel-sonata-mke',
    title: 'Pachelbel Sonata (Milwaukee Residency)',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/viewer%2Fchamber%2F2025-milwaukee%2Fpachelbel_sonata.mp4?alt=media',
    category: 'Chamber Masterclass',
    composer: 'Johann Pachelbel',
    dateRecorded: '2025-12-05',
    description: 'Recorded live at UWM Chamber Series.',
    ensemble: 'BEAM Chamber Trio'
  },
  {
    id: 'work-atlanta-showcase',
    title: 'Black Diaspora Symphony: Atlanta Showcase',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'Orchestral Performance',
    composer: 'Living Composers Suite',
    dateRecorded: '2025-12-05',
    description: 'Atlanta Community Orchestra Network showcase & mentorship concert.',
    ensemble: 'Black Diaspora Symphony Orchestra'
  }
]

export interface InfrastructureNeedTag {
  id: 'housing' | 'transit' | 'meals' | 'instrument_maintenance'
  label: string
  needed: boolean
  priority: 'high' | 'medium' | 'low'
  description?: string
}

export interface LiveLocationBeacon {
  isBroadcasting: boolean
  latitude?: number
  longitude?: number
  accuracy?: number
  cityState?: string
  lastBeaconTime?: string
}

export interface HoodFundAllocation {
  travelPercent: number
  housingPercent: number
  mealsPercent: number
  maintenancePercent: number
}

export const DEFAULT_HOOD_ALLOCATION: HoodFundAllocation = {
  travelPercent: 40,
  housingPercent: 35,
  mealsPercent: 15,
  maintenancePercent: 10
}

export interface ParticipantDemographics {
  fullName: string
  email: string
  primaryRole: string
  originProject: string
  primaryInstrument: string
  disciplineTags?: string[]
  secondaryInstruments?: string[]
  homeHub: string
  isRoamingActive?: boolean
  roamingCity?: string
  current_live_location?: LiveLocationBeacon
  infrastructureNeeds?: InfrastructureNeedTag[]
  portfolioMedia?: MediaPortfolioItem[]
  willingnessToTravel: boolean
  ethnicity: string
  pronouns: string
  educationBackground: string
  culturalCapitalNotes: string
  uncompensatedRehearsalHours: number
  beamCoinBalance: number
  usdTotalEarned: number
  hoodVillageBalance?: number
  hoodAllocations?: HoodFundAllocation
  academicInstitution?: string
  homeOrchestra?: string
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
  primaryRole: 'Section Leader & Resident Cellist',
  originProject: 'Black Diaspora Symphony Orchestra (BDSO)',
  primaryInstrument: 'Violoncello (Cello)',
  disciplineTags: ['Principal Cello', 'Steinway Recording Specialist', 'Media Producer'],
  secondaryInstruments: ['Piano', 'Orchestral Composition'],
  homeHub: 'Milwaukee, WI / Chicago, IL',
  isRoamingActive: true,
  roamingCity: 'Orlando, FL (Steinway Gallery Residency)',
  hoodVillageBalance: 0,
  hoodAllocations: DEFAULT_HOOD_ALLOCATION,
  infrastructureNeeds: [
    { id: 'transit', label: 'Ground Transportation / Transit', needed: true, priority: 'high', description: 'Institutional vehicle/reimbursement for multi-city travel.' },
    { id: 'housing', label: 'Residency Housing', needed: true, priority: 'medium', description: 'Overnight lodgings for Orlando Steinway recording session.' },
    { id: 'meals', label: 'Per Diem / Meal Access', needed: true, priority: 'medium', description: 'Catering & per diem support during multi-day contract runs.' },
    { id: 'instrument_maintenance', label: 'Instrument Maintenance / Luthier', needed: false, priority: 'low', description: 'Cello bow rehair & luthier adjustments.' }
  ],
  portfolioMedia: [
    {
      id: 'p1',
      title: 'Schumann Adagio & Allegro — Steinway Gallery Orlando',
      url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
      category: 'Steinway Session',
      dateAdded: '2025-12-05'
    },
    {
      id: 'p2',
      title: 'Margaret Bonds Ballad of the Brown King — BDSO Annual Concert',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'Orchestral Performance',
      dateAdded: '2025-11-12'
    }
  ],
  willingnessToTravel: true,
  ethnicity: 'Black / African Diaspora',
  pronouns: 'He / Him',
  educationBackground: 'Master of Music (M.M.) Cellist',
  culturalCapitalNotes: 'Cellist & Section Leader for Black Diaspora Symphony Orchestra. Repertoire specialist in Margaret Bonds, Florence Price, and William Grant Still.',
  uncompensatedRehearsalHours: 24,
  beamCoinBalance: 0,
  usdTotalEarned: 0
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
          disciplineTags: data.disciplineTags || (isEzra ? DEFAULT_EZRA_PROFILE.disciplineTags : [data.primaryInstrument || 'Strings / Musician']),
          secondaryInstruments: data.secondaryInstruments || (isEzra ? DEFAULT_EZRA_PROFILE.secondaryInstruments : []),
          homeHub: data.homeHub || (isEzra ? DEFAULT_EZRA_PROFILE.homeHub : 'Member Hub'),
          isRoamingActive: typeof data.isRoamingActive === 'boolean' ? data.isRoamingActive : (isEzra ? true : false),
          roamingCity: data.roamingCity || (isEzra ? DEFAULT_EZRA_PROFILE.roamingCity : ''),
          current_live_location: data.current_live_location || (isEzra ? DEFAULT_EZRA_PROFILE.current_live_location : { isBroadcasting: false }),
          infrastructureNeeds: data.infrastructureNeeds || (isEzra ? DEFAULT_EZRA_PROFILE.infrastructureNeeds : [
            { id: 'transit', label: 'Ground Transportation / Transit', needed: true, priority: 'high', description: 'Institutional vehicle/transit pass support.' },
            { id: 'housing', label: 'Residency Housing', needed: false, priority: 'medium' },
            { id: 'meals', label: 'Per Diem / Meal Access', needed: false, priority: 'medium' }
          ]),
          portfolioMedia: data.portfolioMedia || (isEzra ? DEFAULT_EZRA_PROFILE.portfolioMedia : []),
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
    disciplineTags: ['Strings / Musician'],
    secondaryInstruments: [],
    homeHub: 'Member Hub',
    isRoamingActive: false,
    roamingCity: '',
    infrastructureNeeds: [
      { id: 'transit', label: 'Ground Transportation / Transit', needed: true, priority: 'high', description: 'Institutional vehicle/transit pass support.' },
      { id: 'housing', label: 'Residency Housing', needed: false, priority: 'medium' },
      { id: 'meals', label: 'Per Diem / Meal Access', needed: false, priority: 'medium' }
    ],
    portfolioMedia: [],
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

export interface StateOperationDesignation {
  stateCode: string
  stateName: string
  hubName: string
  operationsDescription: string
  neededMusicianRoles: string[]
}

export interface InstitutionalPortfolioLink {
  id: string
  title: string
  url: string
  type: 'Video Reel' | 'Performance Link' | 'Press Kit / Doc' | 'Grant Document'
  dateAdded: string
}

export interface InstitutionalBusinessProfile {
  id: string
  organizationName: string
  legalName?: string
  email: string
  contactPerson: string
  incorporationStatus: 'Unincorporated / Incubating' | '501(c)(3) Non-Profit' | 'LLC' | 'C-Corp' | 'Pending Registration'
  stateOfRegistration: string
  feinStatus: 'Assigned' | 'Pending Registration' | 'Exempt'
  legalDevelopmentNeeds: string[]
  hasContentPipeline: boolean
  contentCapabilities: string[]
  needsMediaTeamSupport: boolean
  stateOperations: StateOperationDesignation[]
  portfolioLinks: InstitutionalPortfolioLink[]
  totalRosterSize: number
  allocatedStipendsBudgetUsd: number
  generatedBeamCoins: number
}

export const DEFAULT_BADO_FLORIDA_PROFILE: InstitutionalBusinessProfile = {
  id: 'inst-bado-fl',
  organizationName: 'Ballet & Dance Orchestra Florida (BADO FL)',
  legalName: 'Ballet and Dance Orchestra (Florida Division)',
  email: 'badoflorida@gmail.com',
  contactPerson: 'Director of Business Development & Artistic Operations',
  incorporationStatus: 'Unincorporated / Incubating',
  stateOfRegistration: 'Florida (FL)',
  feinStatus: 'Pending Registration',
  legalDevelopmentNeeds: [
    '501(c)(3) Non-Profit Tax-Exempt Filing Support',
    'Florida State Entity Incorporation & Charter',
    'BEAM Fiscal Sponsorship Agreement',
    'Participant Contract & Repertoire Review'
  ],
  hasContentPipeline: true,
  contentCapabilities: [
    'Florida Steinway Gallery Live Session Capture',
    'Multi-Cam Ballet Recital Video Recording',
    'High-Fidelity Audio Mastering'
  ],
  needsMediaTeamSupport: true,
  stateOperations: [
    {
      stateCode: 'FL',
      stateName: 'Florida',
      hubName: 'Steinway Gallery Node — Orlando, FL',
      operationsDescription: 'Chamber masterclasses, Steinway D recording sessions, and ballet company performance accompaniments.',
      neededMusicianRoles: ['Violoncello (Cello)', 'Steinway Piano Technician', 'Principal Concertmaster']
    },
    {
      stateCode: 'WI',
      stateName: 'Wisconsin',
      hubName: 'Miller High Life Theatre — Milwaukee, WI',
      operationsDescription: 'Full symphonic showcase rehearsal intensives and midwest tour staging.',
      neededMusicianRoles: ['Violin II', 'Double Bass', 'Percussion Lead']
    },
    {
      stateCode: 'IL',
      stateName: 'Illinois',
      hubName: 'Symphony Center Hub — Chicago, IL',
      operationsDescription: 'Regional audition screening, string sectionals, and donor galas.',
      neededMusicianRoles: ['Viola', 'Flute']
    }
  ],
  portfolioLinks: [
    {
      id: 'pl-1',
      title: 'BADO Florida 2025 Steinway Gallery Recital Series',
      url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
      type: 'Video Reel',
      dateAdded: '2025-12-05'
    },
    {
      id: 'pl-2',
      title: 'Florida Cultural Endowment & BEAM Wraparound Grant Proposal',
      url: 'https://www.beamthinktank.space/proposals/bado-fl-grant.pdf',
      type: 'Grant Document',
      dateAdded: '2026-01-15'
    }
  ],
  totalRosterSize: 18,
  allocatedStipendsBudgetUsd: 8910,
  generatedBeamCoins: 216
}

export const DEFAULT_BDSO_PROFILE: InstitutionalBusinessProfile = {
  id: 'inst-bdso',
  organizationName: 'Black Diaspora Symphony Orchestra (BDSO)',
  legalName: 'Black Diaspora Symphony Orchestra, Inc.',
  email: 'bdso.orchestra@gmail.com',
  contactPerson: 'Executive Director & Board Chair',
  incorporationStatus: '501(c)(3) Non-Profit',
  stateOfRegistration: 'Wisconsin (WI)',
  feinStatus: 'Assigned',
  legalDevelopmentNeeds: [
    '501(c)(3) Annual IRS Filing Review',
    'Multi-State Tour Performance Contracts',
    'BEAM Endowment Grant Agreement'
  ],
  hasContentPipeline: true,
  contentCapabilities: [
    '4K Symphonic Multi-Cam Stream Production',
    'Orchestral Masterclass Recording',
    'Stereo & Spatial Audio Mastering'
  ],
  needsMediaTeamSupport: false,
  stateOperations: [
    {
      stateCode: 'WI',
      stateName: 'Wisconsin',
      hubName: 'Bradley Symphony Center — Milwaukee, WI',
      operationsDescription: 'Mainstage symphonic subscription series, youth education concerts, and guest soloist recitals.',
      neededMusicianRoles: ['Violin I', 'Violoncello (Cello)', 'French Horn', 'Timpani']
    },
    {
      stateCode: 'IL',
      stateName: 'Illinois',
      hubName: 'Symphony Center Hub — Chicago, IL',
      operationsDescription: 'Midwest regional showcase concerts and soloist residency intensives.',
      neededMusicianRoles: ['Viola', 'Oboe Lead']
    }
  ],
  portfolioLinks: [
    {
      id: 'pl-bdso-1',
      title: 'BDSO Inaugural Symphonic Concert — Bradley Symphony Center',
      url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2Fstudio%2FSchumann%20-%20Adagio%20-%20Take%20II%20-%20Dec%205.mov?alt=media&token=34d0e14a-1721-4826-8e43-e3099d4a81c4',
      type: 'Video Reel',
      dateAdded: '2025-11-20'
    }
  ],
  totalRosterSize: 32,
  allocatedStipendsBudgetUsd: 14200,
  generatedBeamCoins: 340
}

export async function fetchInstitutionalProfile(
  email: string,
  userUid?: string,
  googleName?: string
): Promise<InstitutionalBusinessProfile> {
  const normEmail = normalizeEmail(email)

  if (db && userUid) {
    const primaryId = `inst_role_${userUid}`
    try {
      const snap = await getDoc(doc(db, 'institutionalProfiles', primaryId))
      if (snap.exists()) {
        const data = snap.data() as InstitutionalBusinessProfile
        return {
          ...data,
          email: normEmail
        }
      }
    } catch (err) {
      console.warn('Could not read Firestore institutional profile, using default:', err)
    }
  }

  // Pre-populated defaults for known entities
  if (normEmail.includes('bado') || normEmail.includes('ballet')) {
    return { ...DEFAULT_BADO_FLORIDA_PROFILE, email: normEmail }
  }
  if (normEmail.includes('bdso') || normEmail.includes('blackdiaspora')) {
    return { ...DEFAULT_BDSO_PROFILE, email: normEmail }
  }

  // Default initial profile for new institutional sign-ins
  const orgName = googleName ? `${googleName} (Institutional)` : `${normEmail.split('@')[0].toUpperCase()} Organization`
  return {
    id: userUid ? `inst_${userUid}` : `inst_${normEmail}`,
    organizationName: orgName,
    legalName: orgName,
    email: normEmail,
    contactPerson: 'Institutional Admin',
    incorporationStatus: 'Unincorporated / Incubating',
    stateOfRegistration: 'Florida (FL)',
    feinStatus: 'Pending Registration',
    legalDevelopmentNeeds: [
      'Entity Incorporation & Legal Chartering',
      '501(c)(3) Non-Profit Support',
      'BEAM Fiscal Sponsorship Agreement'
    ],
    hasContentPipeline: true,
    contentCapabilities: ['Live Recording', 'Recital Capture'],
    needsMediaTeamSupport: true,
    stateOperations: [
      {
        stateCode: 'FL',
        stateName: 'Florida',
        hubName: 'Regional Institution Hub',
        operationsDescription: 'Primary performance, rehearsal, and masterclass node.',
        neededMusicianRoles: ['Violin I', 'Cello']
      }
    ],
    portfolioLinks: [],
    totalRosterSize: 12,
    allocatedStipendsBudgetUsd: 5000,
    generatedBeamCoins: 100
  }
}

export async function saveInstitutionalProfile(
  userUid: string,
  email: string,
  profile: Partial<InstitutionalBusinessProfile>
): Promise<void> {
  if (!db || !userUid) return
  const normEmail = normalizeEmail(email)
  const primaryId = `inst_role_${userUid}`

  const payload = {
    ...profile,
    email: normEmail,
    authUid: userUid,
    updatedAt: serverTimestamp()
  }

  await setDoc(doc(db, 'institutionalProfiles', primaryId), payload, { merge: true })
}

/**
 * Dual-write function: Syncs an institutional commitment / booking to a participant's profile.
 * Creates an EventPlayed entry (gig) AND updates the participant's usdTotalEarned stipend balance.
 */
export async function dualWriteInstitutionalCommitmentAsGig(
  participantEmail: string,
  gigCommitment: {
    title: string
    repertoire?: string
    role?: string
    venue: string
    cityState: string
    date: string
    type: EventPlayed['type']
    usdStipend: number
    beamCoinsEarned?: number
    status?: EventPlayed['status']
  },
  userId?: string
): Promise<{ profile: ParticipantDemographics; events: EventPlayed[] }> {
  const normEmail = normalizeEmail(participantEmail)
  const existingProfile = await fetchParticipantProfile(normEmail, userId)
  
  const newGig: EventPlayed = {
    id: `inst-gig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: gigCommitment.title,
    repertoire: gigCommitment.repertoire || 'Selected Orchestral Repertoire',
    role: gigCommitment.role || 'Participating Musician',
    venue: gigCommitment.venue,
    cityState: gigCommitment.cityState,
    date: gigCommitment.date,
    type: gigCommitment.type,
    usdStipend: gigCommitment.usdStipend,
    beamCoinsEarned: gigCommitment.beamCoinsEarned || Math.round(gigCommitment.usdStipend / 20),
    status: gigCommitment.status || 'Confirmed'
  }

  // Get current events or default ezra events
  const existingEvents: EventPlayed[] = (existingProfile.email === normEmail)
    ? DEFAULT_EZRA_EVENTS
    : DEFAULT_EZRA_EVENTS

  const updatedEvents = [newGig, ...existingEvents]
  
  // Calculate new total institutional earnings from dual-written gigs
  const newUsdTotalEarned = updatedEvents.reduce((acc, curr) => acc + (curr.usdStipend || 0), 0)

  const updatedProfile: ParticipantDemographics = {
    ...existingProfile,
    usdTotalEarned: newUsdTotalEarned
  }

  if (db && normEmail) {
    const docId = userId ? `user_${userId}` : `profile_${normEmail}`
    await setDoc(doc(db, 'participantProfiles', docId), {
      ...updatedProfile,
      events: updatedEvents,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  return { profile: updatedProfile, events: updatedEvents }
}
