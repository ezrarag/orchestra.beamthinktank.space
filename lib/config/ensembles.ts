export interface EnsembleConfig {
  slug: string
  name: string
  shortName: string
  subtitle: string
  description: string
  city: string
  organizationId: string
  heroBannerUrl?: string
  status: 'Active' | 'Upcoming' | 'Planning'
  recruitmentTarget: number
  confirmedMusicians: number
  repertoire: {
    title: string
    composer: string
    description: string
  }[]
  compensation: {
    usdTotal: number
    beamCoinsTotal: number
    rates: {
      event: string
      hours: string
      usd: number
      beam: number
    }[]
  }
  rehearsalSchedule: {
    date: string
    time: string
    location: string
    type: 'sectional' | 'tutti' | 'dress' | 'concert'
    title: string
  }[]
  faqs: {
    question: string
    answer: string
  }[]
}

export const ENSEMBLE_CONFIGS: Record<string, EnsembleConfig> = {
  'black-diaspora-symphony': {
    slug: 'black-diaspora-symphony',
    name: 'Black Diaspora Symphony Orchestra',
    shortName: 'BDSO',
    subtitle: '2025 Collaboration celebrating Black musical traditions',
    description: 'Celebrating Black classical composers and performers through high-caliber symphonic projects and community outreach.',
    city: 'Milwaukee, WI',
    organizationId: 'org_black_diaspora_symphony',
    status: 'Active',
    recruitmentTarget: 60,
    confirmedMusicians: 45,
    repertoire: [
      {
        title: 'Montgomery Variations',
        composer: 'Margaret Bonds',
        description: 'A masterpiece honoring Dr. Martin Luther King Jr. and the Montgomery Bus Boycott.'
      },
      {
        title: 'Spiritual Suite',
        composer: 'William Grant Still',
        description: 'Orchestral arrangements reflecting African American spiritual tradition.'
      }
    ],
    compensation: {
      usdTotal: 495,
      beamCoinsTotal: 21,
      rates: [
        { event: 'Sectional Rehearsal', hours: '3 hours', usd: 75, beam: 3 },
        { event: 'Full Orchestra Rehearsal', hours: '4 hours', usd: 100, beam: 4 },
        { event: 'Dress Rehearsal', hours: '4 hours', usd: 120, beam: 4 },
        { event: 'Concert Performance', hours: '2 hours', usd: 200, beam: 10 }
      ]
    },
    rehearsalSchedule: [
      { date: 'Friday, Oct 17', time: '6:00 PM - 9:00 PM', location: 'Milwaukee Youth Arts Center', type: 'sectional', title: 'Strings & Winds Sectional' },
      { date: 'Saturday, Oct 18', time: '10:00 AM - 2:00 PM', location: 'Milwaukee Youth Arts Center', type: 'tutti', title: 'Full Orchestra Tutti' },
      { date: 'Saturday, Oct 25', time: '1:00 PM - 5:00 PM', location: 'Bradley Symphony Center', type: 'dress', title: 'Dress Rehearsal' },
      { date: 'Sunday, Oct 26', time: '3:00 PM - 5:00 PM', location: 'Bradley Symphony Center', type: 'concert', title: 'Gala Memorial Concert' }
    ],
    faqs: [
      { question: 'Who is eligible to audition?', answer: 'Professional and advanced conservatory/university level musicians are invited to apply.' },
      { question: 'How do USD & BEAM Coin payments work?', answer: 'Musicians receive direct USD stipends per contract session plus BEAM Coin credits redeemable for masterclasses, equipment rentals, and lessons.' }
    ]
  },
  'concord-symphony': {
    slug: 'concord-symphony',
    name: 'Concord Symphony / Chamber Orchestra',
    shortName: 'Concord',
    subtitle: 'Core player group contract project directed by Jamin Hoffman',
    description: 'A premier professional chamber orchestra project uniting core orchestral players for specialized symphonic and chamber repertoire.',
    city: 'Concord / Regional',
    organizationId: 'org_concord_symphony',
    status: 'Active',
    recruitmentTarget: 40,
    confirmedMusicians: 28,
    repertoire: [
      {
        title: 'Chamber Symphony Op. 110a',
        composer: 'Dmitri Shostakovich',
        description: 'Intense string orchestra work transcribed from String Quartet No. 8.'
      },
      {
        title: 'Classical Symphony (Symphony No. 1 in D Major)',
        composer: 'Sergei Prokofiev',
        description: 'Neoclassical masterpiece demanding virtuosic chamber precision.'
      }
    ],
    compensation: {
      usdTotal: 495,
      beamCoinsTotal: 21,
      rates: [
        { event: 'Core Sectional', hours: '3 hours', usd: 75, beam: 3 },
        { event: 'Chamber Tutti Rehearsal', hours: '4 hours', usd: 100, beam: 4 },
        { event: 'Final Dress Rehearsal', hours: '4 hours', usd: 120, beam: 4 },
        { event: 'Concord Series Concert', hours: '2 hours', usd: 200, beam: 10 }
      ]
    },
    rehearsalSchedule: [
      { date: 'Thursday, Nov 6', time: '6:30 PM - 9:30 PM', location: 'Concord Arts Center', type: 'sectional', title: 'Core String Sectional' },
      { date: 'Friday, Nov 7', time: '6:00 PM - 10:00 PM', location: 'Concord Hall', type: 'tutti', title: 'Full Chamber Rehearsal' },
      { date: 'Saturday, Nov 8', time: '2:00 PM - 6:00 PM', location: 'Concord Concert Hall', type: 'dress', title: 'Dress Rehearsal' },
      { date: 'Sunday, Nov 9', time: '4:00 PM - 6:00 PM', location: 'Concord Concert Hall', type: 'concert', title: 'Concord Masterworks Concert' }
    ],
    faqs: [
      { question: 'What is the roster size for Concord Symphony?', answer: 'Concord Symphony operates as a flexible core player ensemble of 35-40 key instrumentalists selected by Music Director Jamin Hoffman.' },
      { question: 'How do musicians participate?', answer: 'Musicians submit their credentials and excerpt audition through the project hub to be reviewed for core roster placement.' }
    ]
  }
}

export function getEnsembleConfig(slug: string): EnsembleConfig {
  if (ENSEMBLE_CONFIGS[slug]) {
    return ENSEMBLE_CONFIGS[slug]
  }
  
  // Format slug to readable title fallback
  const readableName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return {
    slug,
    name: readableName,
    shortName: readableName,
    subtitle: 'BEAM Contract Project',
    description: `Professional contract project for ${readableName}.`,
    city: 'Regional',
    organizationId: `org_${slug.replace(/-/g, '_')}`,
    status: 'Active',
    recruitmentTarget: 40,
    confirmedMusicians: 10,
    repertoire: [],
    compensation: ENSEMBLE_CONFIGS['black-diaspora-symphony'].compensation,
    rehearsalSchedule: [],
    faqs: []
  }
}
