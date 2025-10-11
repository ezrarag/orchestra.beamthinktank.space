'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Music, 
  Calendar, 
  DollarSign, 
  Coins, 
  Upload, 
  Play,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Award,
  Info,
  Download,
  Phone,
  Mail,
  Linkedin,
  MapPin as Location
} from 'lucide-react'
import ProjectMediaGallery from '@/components/ProjectMediaGallery'

// Real musician data from Firestore collection
const rosterData = [
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

const rehearsalSchedule = [
  { date: '2025-01-15', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Strings' },
  { date: '2025-01-18', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Winds' },
  { date: '2025-01-22', time: '7:00 PM', duration: 4, location: 'BEAM Rehearsal Hall', type: 'Full Orchestra' },
  { date: '2025-01-25', time: '7:00 PM', duration: 3, location: 'BEAM Rehearsal Hall', type: 'Sectional - Brass' },
  { date: '2025-01-29', time: '7:00 PM', duration: 4, location: 'BEAM Rehearsal Hall', type: 'Full Orchestra' },
  { date: '2025-02-01', time: '7:00 PM', duration: 4, location: 'Orlando Concert Hall', type: 'Dress Rehearsal' },
  { date: '2025-02-02', time: '3:00 PM', duration: 2, location: 'Orlando Concert Hall', type: 'Concert' }
]

const faqData = [
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

const navigationSections = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'schedule', label: 'Rehearsals', icon: Calendar },
  { id: 'faq', label: 'FAQ', icon: Info },
  { id: 'media', label: 'Media', icon: Play }
]

export default function BlackDiasporaSymphonyPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showAuditionForm, setShowAuditionForm] = useState(false)
  const [submittedAudition, setSubmittedAudition] = useState(false)
  const [activeSection, setActiveSection] = useState('roster')
  const [scrollY, setScrollY] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const totalNeeded = rosterData.reduce((sum, section) => sum + section.needed, 0)
  const totalConfirmed = rosterData.reduce((sum, section) => sum + section.confirmed, 0)
  const totalInterested = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Interested').length, 0
  )
  const totalPending = rosterData.reduce((sum, section) => 
    sum + section.musicianDetails.filter(m => m.status === 'Pending').length, 0
  )
  const overallPercentage = Math.round((totalConfirmed / totalNeeded) * 100)

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Update active section and scroll position based on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      
      const sections = navigationSections.map(section => section.id)
      const scrollPosition = window.scrollY + window.innerHeight / 2

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i])
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => console.log('Video error:', e)}
          onLoadStart={() => console.log('Video loading started')}
        >
          <source src="https://link.storjshare.io/raw/ju2fwbvsloifiuwlrnp7jmwurlqa/orchestabeam/1011.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Dynamic Overlay - gets darker and blurrier on scroll */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={{
            opacity: Math.min(scrollY / 1000, 0.7),
            backdropFilter: `blur(${Math.min(scrollY / 50, 10)}px)`,
          }}
        />
        
        {/* Static gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-slate-900/60 to-blue-900/60" />
      </div>

      {/* Hero Section - Portfolio Style */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 items-center">
            {/* Left Content Area */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white text-sm">Active Project</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-yellow-400 text-lg font-semibold uppercase tracking-wider mb-2">
                  PROJECT DASHBOARD
                </h2>
                <h1 className="text-6xl md:text-8xl font-bold text-white leading-tight">
                  Black Diaspora<br />Symphony Orchestra
                </h1>
              </div>

              {/* Project Info */}
              <div className="space-y-4">
                <div className="flex items-center text-white">
                  <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                  <span>2025 Annual Memorial Concert</span>
                </div>
                <div className="flex items-center text-white">
                  <Users className="w-5 h-5 mr-3 text-purple-400" />
                  <span>{totalConfirmed}/{totalNeeded} Musicians Confirmed ({overallPercentage}%)</span>
                </div>
                <div className="flex items-center text-white">
                  <Music className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Margaret Bonds' Montgomery Variations</span>
                </div>
                <div className="flex items-center text-white">
                  <Location className="w-5 h-5 mr-3 text-purple-400" />
                  <span>Orlando Concert Hall, Florida</span>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToSection('roster')}
                className="bg-yellow-400 text-black font-semibold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                View Project Details
              </motion.button>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24">
        {/* Roster Visualization */}
        <motion.section
          id="roster"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Music className="w-8 h-8 mr-3 text-purple-400" />
              Orchestra Roster
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Roster Table */}
              <div className="space-y-4">
                {rosterData.map((section, index) => (
                  <motion.div
                    key={section.instrument}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{section.instrument}</h3>
                      <div className="text-sm text-gray-300">
                        {section.confirmed}/{section.needed} filled
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${section.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {section.remaining > 0 ? (
                        <span className="text-yellow-400">
                          {section.remaining} position{section.remaining > 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="text-green-400">Section complete!</span>
                      )}
                    </div>
                    
                    {section.musicianDetails.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {section.musicianDetails.map((musician, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-medium text-sm">{musician.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                musician.status === 'Confirmed' 
                                  ? 'bg-green-500/20 text-green-300'
                                  : musician.status === 'Interested'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : musician.status === 'Pending'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {musician.status}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📧</span>
                                {musician.email}
                              </div>
                              <div className="flex items-center mb-1">
                                <span className="mr-2">📅</span>
                                {musician.source}
                              </div>
                              {musician.notes && (
                                <div className="text-gray-500 text-xs mt-1 italic">
                                  {musician.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Audition Submission Panel */}
              <div className="space-y-6">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <Upload className="w-6 h-6 mr-2 text-purple-400" />
                    Submit Your Audition
                  </h3>
                  
                  {!submittedAudition ? (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        Upload your audition video or provide a link to showcase your musical abilities.
                      </p>
                      
                      <button
                        onClick={() => setShowAuditionForm(!showAuditionForm)}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        {showAuditionForm ? 'Hide Form' : 'Submit Audition'}
                      </button>
                      
                      {showAuditionForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Full Name
                            </label>
                            <input
                              type="text"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Enter your full name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Instrument
                            </label>
                            <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                              <option value="">Select your instrument</option>
                              {rosterData.map(section => (
                                <option key={section.instrument} value={section.instrument}>
                                  {section.instrument}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Email Address
                            </label>
                            <input
                              type="email"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="your.email@example.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Audition Video
                            </label>
                            <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer">
                              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                              <p className="text-gray-300 text-sm">Click to upload or drag and drop</p>
                              <p className="text-gray-500 text-xs mt-1">MP4, MOV, or provide YouTube/Vimeo link</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setSubmittedAudition(true)}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                          >
                            Submit Audition
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8 text-green-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Audition Submitted!</h4>
                      <p className="text-gray-300 text-sm">
                        Thank you for your submission. We'll review your audition and contact you within 48 hours.
                      </p>
                    </div>
                  )}
                </div>

                {/* Required Excerpts */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Play className="w-5 h-5 mr-2 text-purple-400" />
                    Required Excerpts
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium">Montgomery Variations</p>
                        <p className="text-gray-400 text-sm">Margaret Bonds - Movement I</p>
                      </div>
                      <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        Download PDF
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium">Spiritual Suite</p>
                        <p className="text-gray-400 text-sm">William Grant Still - Selected passages</p>
                      </div>
                      <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Pay & Participation Visualization */}
        <motion.section
          id="compensation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-400" />
              Compensation & Rewards
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* USD Payments */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                  USD Contract Pay (via BDO)
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Sectional Rehearsal (3 hrs)</span>
                    <span className="text-white font-semibold">$75</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Full Orchestra (4 hrs)</span>
                    <span className="text-white font-semibold">$100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Dress Rehearsal (4 hrs)</span>
                    <span className="text-white font-semibold">$120</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-white font-semibold">Concert Performance (2 hrs)</span>
                    <span className="text-white font-bold text-lg">$200</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-200 text-sm">
                    <strong>Total Project Earnings:</strong> Up to $495 USD per musician
                  </p>
                </div>
              </div>

              {/* BEAM Coin Rewards */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Coins className="w-6 h-6 mr-2 text-yellow-400" />
                  BEAM Coin Rewards
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Sectional Rehearsal</span>
                    <span className="text-yellow-400 font-semibold">3 BEAM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Full Orchestra</span>
                    <span className="text-yellow-400 font-semibold">4 BEAM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Dress Rehearsal</span>
                    <span className="text-yellow-400 font-semibold">4 BEAM</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-white font-semibold">Concert Performance</span>
                    <span className="text-yellow-400 font-bold text-lg">10 BEAM</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-yellow-200 text-sm">
                    <strong>Total BEAM Rewards:</strong> Up to 21 BEAM Coins per musician
                  </p>
                  <p className="text-yellow-200 text-xs mt-1">
                    Redeemable for lessons, equipment, or transferable to other musicians
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Rehearsal Calendar */}
        <motion.section
          id="schedule"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-blue-400" />
              Rehearsal Schedule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rehearsalSchedule.map((rehearsal, index) => (
                <motion.div
                  key={rehearsal.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-blue-400/50 transition-colors"
                >
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                    <span className="text-white font-semibold">
                      {new Date(rehearsal.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-300">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.time}</span>
                      <span className="text-xs ml-2">({rehearsal.duration}h)</span>
                    </div>
                    
                    <div className="flex items-center text-gray-300">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">{rehearsal.location}</span>
                    </div>
                    
                    <div className="mt-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        rehearsal.type.includes('Sectional') 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : rehearsal.type.includes('Concert')
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {rehearsal.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Info className="w-8 h-8 mr-3 text-purple-400" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                  className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Media Gallery */}
        <motion.section
          id="media"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <ProjectMediaGallery />
        </motion.section>
      </div>

      {/* Bottom Navigation - Portfolio Style */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20"
        >
          <div className="flex items-center space-x-8">
            {navigationSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
