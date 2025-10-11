// BDSO Project Data - separated to reduce bundle size
export const rosterData = [
  { 
    instrument: 'Violin I', 
    needed: 8, 
    confirmed: 1, 
    remaining: 7, 
    percentage: 13, 
    musicians: ['Yolanda Odufuwa'], 
    musicianDetails: [
      { name: 'Yolanda Odufuwa', email: 'yolandaodufuwa@gmail.com', status: 'Pending', source: 'Email (Oct 1)', notes: 'Beginner violinist rejoining after lessons with Fatima.' }
    ]
  },
  { 
    instrument: 'Violin II', 
    needed: 6, 
    confirmed: 0, 
    remaining: 6, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Viola', 
    needed: 6, 
    confirmed: 0, 
    remaining: 6, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Cello', 
    needed: 4, 
    confirmed: 0, 
    remaining: 4, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Bass', 
    needed: 3, 
    confirmed: 0, 
    remaining: 3, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Flute', 
    needed: 2, 
    confirmed: 0, 
    remaining: 2, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Oboe', 
    needed: 2, 
    confirmed: 0, 
    remaining: 2, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Clarinet', 
    needed: 2, 
    confirmed: 0, 
    remaining: 2, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Bassoon', 
    needed: 2, 
    confirmed: 0, 
    remaining: 2, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Horn', 
    needed: 4, 
    confirmed: 2, 
    remaining: 2, 
    percentage: 50, 
    musicians: ['Maya Schiek', 'Rachel Jacobson'], 
    musicianDetails: [
      { name: 'Maya Schiek', email: 'MayaSchiek@outlook.com', status: 'Confirmed', source: 'Email (Oct 9)', notes: 'Experienced hornist, recently moved back to Milwaukee.' },
      { name: 'Rachel Jacobson', email: 'rachel.jacobson.horn@gmail.com', status: 'Interested', source: 'Email (Sep 29)', notes: 'UWM graduate, available for December concert.' }
    ]
  },
  { 
    instrument: 'Trumpet', 
    needed: 3, 
    confirmed: 0, 
    remaining: 3, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Trombone', 
    needed: 3, 
    confirmed: 0, 
    remaining: 3, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Tuba', 
    needed: 1, 
    confirmed: 0, 
    remaining: 1, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Harp', 
    needed: 1, 
    confirmed: 1, 
    remaining: 0, 
    percentage: 100, 
    musicians: ['Calvin Stokes'], 
    musicianDetails: [
      { name: 'Calvin Stokes', email: 'theharper@aol.com', status: 'Confirmed', source: 'Faculty contact (Oct 7)', notes: 'Advisory / faculty participant for training orchestra.' }
    ]
  },
  { 
    instrument: 'Timpani', 
    needed: 1, 
    confirmed: 0, 
    remaining: 1, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  },
  { 
    instrument: 'Percussion', 
    needed: 2, 
    confirmed: 0, 
    remaining: 2, 
    percentage: 0, 
    musicians: [], 
    musicianDetails: []
  }
]

export const rehearsalSchedule = [
  { date: '2025-01-15', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Strings' },
  { date: '2025-01-18', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Winds' },
  { date: '2025-01-22', time: '7:00 PM', duration: 4, location: 'BEAM Rehearsal Hall', type: 'Full Orchestra' },
  { date: '2025-01-25', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Brass' },
  { date: '2025-01-29', time: '7:00 PM', duration: 4, location: 'BEAM Rehearsal Hall', type: 'Full Orchestra' },
  { date: '2025-02-01', time: '7:00 PM', duration: 4, location: 'Orlando Concert Hall', type: 'Dress Rehearsal' },
  { date: '2025-02-02', time: '3:00 PM', duration: 2, location: 'Orlando Concert Hall', type: 'Concert' }
]

export const faqData = [
  {
    question: "What is the rehearsal schedule?",
    answer: "Rehearsals are held on Wednesday and Saturday evenings at BEAM Rehearsal Hall. Sectional rehearsals run 3 hours, full orchestra rehearsals run 4 hours. See the calendar below for specific dates and times."
  },
  {
    question: "How does payment work?",
    answer: "Musicians receive both USD contract pay via BDO and BEAM Coin rewards. USD payments are processed after each rehearsal block, while BEAM Coin is automatically allocated based on attendance and participation."
  },
  {
    question: "What are BEAM Coins?",
    answer: "BEAM Coins are digital tokens that can be redeemed for music lessons, equipment, or transferred to other musicians in the BEAM ecosystem. They're earned through participation and can be used across all BEAM projects."
  },
  {
    question: "Where do I submit my audition?",
    answer: "Use the audition submission form on this page. You can upload video files directly or provide a YouTube/Vimeo link. Include required excerpts from Montgomery Variations and other specified works."
  },
  {
    question: "What music will we be performing?",
    answer: "The program features Margaret Bonds' Montgomery Variations alongside other works celebrating the Black musical tradition. Sheet music will be provided digitally through our platform."
  },
  {
    question: "Is parking available?",
    answer: "Yes, free parking is available at BEAM Rehearsal Hall. For the concert at Orlando Concert Hall, validated parking is provided in the adjacent garage."
  }
]
