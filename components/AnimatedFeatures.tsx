'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, Users, Music, Heart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: <Calendar className="h-8 w-8 text-orchestra-gold" />,
    title: "Performances",
    description: "Experience our seasonal concerts and special events",
    href: "/performances",
    color: "from-orchestra-gold/20 to-orchestra-gold/10"
  },
  {
    icon: <Users className="h-8 w-8 text-orchestra-gold" />,
    title: "Rehearsals",
    description: "Join our weekly rehearsals and musical development",
    href: "/rehearsals",
    color: "from-orchestra-gold/20 to-orchestra-gold/10"
  },
  {
    icon: <Music className="h-8 w-8 text-orchestra-gold" />,
    title: "Member Directory",
    description: "Connect with fellow musicians and artists",
    href: "/members",
    color: "from-orchestra-gold/20 to-orchestra-gold/10"
  },
  {
    icon: <Heart className="h-8 w-8 text-orchestra-gold" />,
    title: "Scholarship Fund",
    description: "Supporting young musicians in their journey",
    href: "/scholarship",
    color: "from-orchestra-gold/20 to-orchestra-gold/10"
  }
]

export default function AnimatedFeatures() {
  const { scrollY } = useScroll()
  
  const sectionOpacity = useTransform(scrollY, [300, 600], [0, 1])
  const sectionY = useTransform(scrollY, [300, 600], [100, 0])

  return (
    <motion.section
      id="features"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        opacity: sectionOpacity,
        y: sectionY,
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-orchestra-gold/20 via-transparent to-orchestra-gold/10" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-serif text-orchestra-dark mb-6">
            What We Offer
          </h2>
          <p className="text-xl text-orchestra-brown/80 max-w-3xl mx-auto">
            Discover the comprehensive musical experience that awaits you at BEAM Orchestra
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative"
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
              {/* Card */}
              <div className="card text-center h-full relative overflow-hidden">
                {/* Hover Effect Background */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  initial={false}
                />
                
                {/* Content */}
                <div className="relative z-10">
                  <motion.div
                    className="bg-orchestra-gold/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:bg-orchestra-gold/30 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {feature.icon}
                  </motion.div>
                  
                  <h3 className="text-xl font-serif text-orchestra-dark mb-3 group-hover:text-orchestra-gold transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-orchestra-brown/80 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <Link 
                    href={feature.href}
                    className="inline-flex items-center text-orchestra-gold hover:text-orchestra-brown transition-colors duration-300 group/link"
                  >
                    <span className="mr-2">Learn More</span>
                    <motion.div
                      className="group-hover/link:translate-x-1 transition-transform duration-300"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-lg text-orchestra-brown/80 mb-8 max-w-2xl mx-auto">
            Ready to experience the magic of classical music? Join us for our next performance or rehearsal.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/performances" className="btn-primary text-lg px-8 py-4">
              Explore All Offerings
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  )
}
