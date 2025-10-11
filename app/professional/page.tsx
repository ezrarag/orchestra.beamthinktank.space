'use client'

import { motion } from 'framer-motion'
import { 
  Music, 
  Users, 
  Calendar, 
  MapPin, 
  Award, 
  Star,
  ArrowRight,
  Play,
  Download
} from 'lucide-react'
import Link from 'next/link'

const upcomingPerformances = [
  {
    title: "Spring Concert Series",
    date: "2025-03-15",
    time: "7:30 PM",
    venue: "Orlando Concert Hall",
    description: "Featuring works by Beethoven, Brahms, and contemporary composers",
    ticketPrice: 35,
    status: "On Sale"
  },
  {
    title: "Chamber Music Gala",
    date: "2025-04-22",
    time: "7:00 PM",
    venue: "BEAM Performance Center",
    description: "Intimate chamber works featuring our principal musicians",
    ticketPrice: 25,
    status: "Coming Soon"
  },
  {
    title: "Summer Festival Opening",
    date: "2025-06-08",
    time: "8:00 PM",
    venue: "Lake Eola Park Amphitheater",
    description: "Free outdoor concert celebrating community and music",
    ticketPrice: 0,
    status: "Free Event"
  }
]

const orchestraMembers = [
  {
    name: "Dr. Sarah Chen",
    position: "Music Director",
    instrument: "Conductor",
    bio: "Award-winning conductor with over 15 years of experience leading professional orchestras across the country.",
    image: "/images/sarah-chen.jpg"
  },
  {
    name: "Michael Rodriguez",
    position: "Concertmaster",
    instrument: "Violin",
    bio: "Former principal violinist with the Miami Symphony, known for his passionate interpretations of classical works.",
    image: "/images/michael-rodriguez.jpg"
  },
  {
    name: "Dr. Emily Johnson",
    position: "Principal Cello",
    instrument: "Cello",
    bio: "Soloist and chamber musician with performances at Carnegie Hall and international festivals.",
    image: "/images/emily-johnson.jpg"
  }
]

const partners = [
  {
    name: "Black Diaspora Symphony Orchestra",
    description: "Collaborative partner for cross-cultural musical experiences",
    logo: "/logos/bdso-logo.png"
  },
  {
    name: "Milwaukee Film Orchestra",
    description: "Live orchestral accompaniment for independent cinema",
    logo: "/logos/milwaukee-film-logo.png"
  },
  {
    name: "Orlando Arts District",
    description: "Community partnership for cultural programming",
    logo: "/logos/orlando-arts-logo.png"
  }
]

export default function ProfessionalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              BEAM Professional Orchestra
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto">
              Orlando's premier professional orchestra, dedicated to musical excellence and community engagement
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white">
                <Users className="w-5 h-5 mr-2" />
                <span className="font-semibold">60+ Professional Musicians</span>
              </div>
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white">
                <Award className="w-5 h-5 mr-2" />
                <span className="font-semibold">Award-Winning Performances</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  Musical Excellence in the Heart of Orlando
                </h2>
                <p className="text-gray-300 leading-relaxed mb-6">
                  The BEAM Professional Orchestra represents the pinnacle of musical artistry in Central Florida. 
                  Our ensemble of world-class musicians brings together decades of experience from major orchestras 
                  and conservatories worldwide.
                </p>
                <p className="text-gray-300 leading-relaxed mb-8">
                  We're committed to presenting innovative programming that bridges classical traditions with 
                  contemporary works, while fostering community connections through accessible performances and 
                  educational outreach.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/performances"
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Upcoming Performances
                  </Link>
                  <Link
                    href="/training"
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Join Our Training Program
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-8 border border-purple-500/30">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Music className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Season 2025</h3>
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Concerts:</span>
                        <span className="text-white font-semibold">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Educational Programs:</span>
                        <span className="text-white font-semibold">8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Community Events:</span>
                        <span className="text-white font-semibold">15</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Repertoire Pieces:</span>
                        <span className="text-white font-semibold">45+</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Featured Performances */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Featured Performances
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Experience the power of live orchestral music in our carefully curated season
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingPerformances.map((performance, index) => (
              <motion.div
                key={performance.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-300"
              >
                <div className="mb-4">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                    performance.status === 'On Sale' 
                      ? 'bg-green-500/20 text-green-300'
                      : performance.status === 'Coming Soon'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {performance.status}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {performance.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {performance.description}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(performance.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {performance.time}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    {performance.venue}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-white">
                    {performance.ticketPrice === 0 ? 'FREE' : `$${performance.ticketPrice}`}
                  </div>
                  <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                    {performance.ticketPrice === 0 ? 'RSVP' : 'Buy Tickets'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Leadership Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Leadership Team
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Meet the talented musicians who lead our orchestra
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {orchestraMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">
                  {member.name}
                </h3>
                <div className="text-purple-300 font-medium mb-2">
                  {member.position}
                </div>
                <div className="text-gray-400 text-sm mb-4">
                  {member.instrument}
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  {member.bio}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Partners */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Collaborative Partners
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Working together to expand musical opportunities and cultural experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center hover:border-green-400/50 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {partner.name}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {partner.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Experience the Magic of Live Orchestra
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join us for unforgettable performances that celebrate the beauty and power of orchestral music. 
              From intimate chamber concerts to grand symphonic works, there's something for every music lover.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/performances"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                View All Performances
              </Link>
              
              <Link
                href="/members"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Users className="w-5 h-5 mr-2" />
                Meet Our Musicians
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
