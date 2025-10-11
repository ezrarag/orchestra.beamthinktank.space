'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Users, Music, Calendar, Award } from 'lucide-react'
import Link from 'next/link'

const contractProjects = [
  {
    title: "Black Diaspora Symphony Orchestra",
    description: "2025 Collaboration celebrating the Black musical tradition through Margaret Bonds' Montgomery Variations and other works.",
    status: "Active",
    musicians: "45/60",
    progress: 75,
    href: "/training/contract-projects/black-diaspora-symphony",
    color: "from-purple-500 to-blue-500"
  },
  {
    title: "Milwaukee Film Orchestra",
    description: "Live orchestral accompaniment for independent film screenings and special events.",
    status: "Upcoming",
    musicians: "0/40",
    progress: 0,
    href: "#",
    color: "from-green-500 to-teal-500"
  },
  {
    title: "Chamber Music Series",
    description: "Intimate chamber ensemble performances featuring classical and contemporary works.",
    status: "Planning",
    musicians: "0/20",
    progress: 0,
    href: "#",
    color: "from-orange-500 to-red-500"
  }
]

const trainingPrograms = [
  {
    title: "Professional Development",
    description: "Advanced training for emerging professional musicians",
    icon: Award,
    href: "#"
  },
  {
    title: "Community Outreach",
    description: "Educational programs connecting classical music with diverse communities",
    icon: Users,
    href: "#"
  },
  {
    title: "Performance Opportunities",
    description: "Regular concert series and special event performances",
    icon: Music,
    href: "#"
  }
]

export default function TrainingPage() {
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
              BEAM Training Orchestra
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto">
              Professional development through contract projects, chamber music, and community engagement
            </p>
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white">
              <Users className="w-5 h-5 mr-2" />
              <span className="font-semibold">Join our community of 200+ musicians</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contract Projects Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Active Contract Projects
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Join our professional training orchestra through paid contract projects with leading cultural organizations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {contractProjects.map((project, index) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="group"
              >
                <Link href={project.href} className="block">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-purple-400/50 transition-all duration-300 h-full">
                    <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                      project.status === 'Active' 
                        ? 'bg-green-500/20 text-green-300' 
                        : project.status === 'Upcoming'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {project.status}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                      {project.title}
                    </h3>
                    
                    <p className="text-gray-300 mb-6 leading-relaxed">
                      {project.description}
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Musicians</span>
                        <span className="text-white font-semibold">{project.musicians}</span>
                      </div>
                      
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${project.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center text-purple-300 font-medium group-hover:text-purple-200 transition-colors">
                      <span className="mr-2">
                        {project.status === 'Active' ? 'View Project' : 'Learn More'}
                      </span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Training Programs Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Training Programs
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Comprehensive musical education and professional development opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trainingPrograms.map((program, index) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-400/50 transition-all duration-300 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <program.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {program.title}
                </h3>
                
                <p className="text-gray-300 leading-relaxed mb-6">
                  {program.description}
                </p>
                
                <Link
                  href={program.href}
                  className="inline-flex items-center text-blue-300 hover:text-blue-200 font-medium transition-colors"
                >
                  <span className="mr-2">Learn More</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Join Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Join BEAM Training?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Whether you're an emerging professional or seasoned musician, our training orchestra offers unique opportunities for growth and collaboration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/training/contract-projects/black-diaspora-symphony"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Music className="w-5 h-5 mr-2" />
                Submit Audition
              </Link>
              
              <Link
                href="/members"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Users className="w-5 h-5 mr-2" />
                View All Members
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
