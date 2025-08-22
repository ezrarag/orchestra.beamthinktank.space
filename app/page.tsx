'use client'

import AnimatedHero from '@/components/AnimatedHero'
import AnimatedFeatures from '@/components/AnimatedFeatures'
import CourseCatalog from '@/components/CourseCatalog'
import RehearsalCountdown from '@/components/RehearsalCountdown'
import ProgressBar from '@/components/ProgressBar'
import MediaPlayer from '@/components/MediaPlayer'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, Music, ArrowRight, Heart, Target, TrendingUp, Users } from 'lucide-react'

export default function Home() {
  const { scrollY } = useScroll()
  
  // Transform scroll position for the blur and movement effects
  const featuresOpacity = useTransform(scrollY, [300, 600], [0, 1])
  const featuresY = useTransform(scrollY, [300, 600], [100, 0])
  const featuresBlur = useTransform(scrollY, [300, 600], [20, 0])
  
  const coursesOpacity = useTransform(scrollY, [800, 1200], [0, 1])
  const coursesY = useTransform(scrollY, [800, 1200], [100, 0])
  const coursesBlur = useTransform(scrollY, [800, 1200], [20, 0])
  
  const rehearsalsOpacity = useTransform(scrollY, [1200, 1600], [0, 1])
  const rehearsalsY = useTransform(scrollY, [1200, 1600], [100, 0])
  const rehearsalsBlur = useTransform(scrollY, [1200, 1600], [20, 0])
  
  const progressOpacity = useTransform(scrollY, [1600, 2000], [0, 1])
  const progressY = useTransform(scrollY, [1600, 2000], [100, 0])
  const progressBlur = useTransform(scrollY, [1600, 2000], [20, 0])
  
  const mediaOpacity = useTransform(scrollY, [2000, 2400], [0, 1])
  const mediaY = useTransform(scrollY, [2000, 2400], [100, 0])
  const mediaBlur = useTransform(scrollY, [2000, 2400], [20, 0])
  
  const eventsOpacity = useTransform(scrollY, [2400, 2800], [0, 1])
  const eventsY = useTransform(scrollY, [2400, 2800], [100, 0])
  const eventsBlur = useTransform(scrollY, [2400, 2800], [20, 0])
  
  const ctaOpacity = useTransform(scrollY, [2800, 3200], [0, 1])
  const ctaY = useTransform(scrollY, [2800, 3200], [100, 0])
  const ctaBlur = useTransform(scrollY, [2800, 3200], [20, 0])

  return (
    <div className="min-h-screen">
      <AnimatedHero />
      
      {/* Features Section with Scroll Effects */}
      <motion.section 
        id="features"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          opacity: featuresOpacity,
          y: featuresY,
          filter: `blur(${featuresBlur}px)`,
        }}
      >
        <AnimatedFeatures />
      </motion.section>
      
      {/* Course Catalog with Scroll Effects */}
      <motion.section 
        id="courses"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30 relative overflow-hidden"
        style={{
          opacity: coursesOpacity,
          y: coursesY,
          filter: `blur(${coursesBlur}px)`,
        }}
      >
        <CourseCatalog />
      </motion.section>

      {/* Rehearsal Countdown with Scroll Effects */}
      <motion.section 
        id="rehearsals"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          opacity: rehearsalsOpacity,
          y: rehearsalsY,
          filter: `blur(${rehearsalsBlur}px)`,
        }}
      >
        <RehearsalCountdown />
      </motion.section>

      {/* Progress & Milestones Section with Scroll Effects */}
      <motion.section 
        id="progress"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-orchestra-cream/30"
        style={{
          opacity: progressOpacity,
          y: progressY,
          filter: `blur(${progressBlur}px)`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-orchestra-dark mb-6">
              Our Progress & Milestones
            </h2>
            <p className="text-xl text-orchestra-brown/80 max-w-3xl mx-auto">
              Track our journey towards musical excellence and community impact
            </p>
          </motion.div>

          {/* Progress Bars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProgressBar
              title="Scholarship Fund"
              current={12500}
              goal={25000}
              icon={<Heart className="h-5 w-5" />}
              color="orchestra-gold"
            />
            <ProgressBar
              title="Instrument Fund"
              current={8500}
              goal={15000}
              icon={<Music className="h-5 w-5" />}
              color="orchestra-brown"
            />
            <ProgressBar
              title="Community Outreach"
              current={75}
              goal={100}
              icon={<Target className="h-5 w-5" />}
              color="orchestra-navy"
            />
          </div>

          {/* Milestone Achievements */}
          <motion.div
            className="mt-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold text-orchestra-dark mb-8">
              Recent Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { number: '50+', label: 'Active Members', icon: <Users className="h-6 w-6" /> },
                { number: '25', label: 'Performances This Year', icon: <Calendar className="h-6 w-6" /> },
                { number: '100%', label: 'Community Satisfaction', icon: <TrendingUp className="h-6 w-6" /> }
              ].map((achievement, index) => (
                <motion.div
                  key={achievement.label}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <div className="bg-orchestra-gold/20 p-6 rounded-2xl border border-orchestra-gold/30">
                    <div className="text-orchestra-gold mb-3">
                      {achievement.icon}
                    </div>
                    <div className="text-3xl font-bold text-orchestra-dark mb-2">
                      {achievement.number}
                    </div>
                    <div className="text-orchestra-label">
                      {achievement.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Media Player Section with Scroll Effects */}
      <motion.section 
        id="media"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          opacity: mediaOpacity,
          y: mediaY,
          filter: `blur(${mediaBlur}px)`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-orchestra-dark text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Featured Music
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MediaPlayer 
              title="Symphony No. 5 in C Minor"
              composer="Ludwig van Beethoven"
              className="max-w-2xl mx-auto"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* Upcoming Events Preview with Scroll Effects */}
      <motion.section 
        id="events"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30 relative overflow-hidden"
        style={{
          opacity: eventsOpacity,
          y: eventsY,
          filter: `blur(${eventsBlur}px)`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-orchestra-dark"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
            >
              Upcoming Performances
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link href="/performances" className="text-orchestra-gold hover:text-orchestra-brown transition-colors flex items-center space-x-2 group">
                <span>View All</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Sample Performance Cards */}
            {[
              {
                title: 'Winter Concert Series',
                description: 'A celebration of classical masterpieces featuring our full orchestra',
                date: 'Dec 15, 2024',
                price: '$25'
              },
              {
                title: 'Chamber Music Evening',
                description: 'Intimate performances by our chamber ensembles',
                date: 'Dec 22, 2024',
                price: '$15'
              },
              {
                title: 'New Year\'s Gala',
                description: 'Ring in the new year with classical favorites and champagne',
                date: 'Jan 1, 2025',
                price: '$50'
              }
            ].map((performance, index) => (
              <motion.div
                key={performance.title}
                className="card group hover:shadow-2xl transition-all duration-300"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
              >
                <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orchestra-gold/30 transition-colors">
                  <Music className="h-16 w-16 text-orchestra-gold" />
                </div>
                <h3 className="text-xl font-bold text-orchestra-dark mb-2 group-hover:text-orchestra-gold transition-colors">
                  {performance.title}
                </h3>
                <p className="text-orchestra-brown/80 mb-3">
                  {performance.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-orchestra-gold font-medium">{performance.date}</span>
                  <span className="text-orchestra-brown">{performance.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Call to Action with Scroll Effects */}
      <motion.section 
        id="cta"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{
          opacity: ctaOpacity,
          y: ctaY,
          filter: `blur(${ctaBlur}px)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-orchestra-dark mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
          >
            Join Our Musical Community
          </motion.h2>
          <motion.p 
            className="text-lg text-orchestra-brown/80 mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Whether you're a musician looking to perform, an audience member seeking beautiful music, 
            or a supporter of the arts, there's a place for you in the BEAM Orchestra family.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/rehearsals" className="btn-primary">
                Join Rehearsals
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/donate" className="btn-secondary">
                Make a Donation
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  )
}
