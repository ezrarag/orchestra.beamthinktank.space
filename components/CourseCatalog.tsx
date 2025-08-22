'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Music, Clock, Video, MapPin, Users, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  duration: string
  format: 'Zoom' | 'In-Person' | 'Hybrid'
  price: number
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  instructor: string
  maxStudents: number
  currentStudents: number
  image: string
  category: 'Orchestra Excerpts' | 'Full Orchestra Training'
}

const courses: Course[] = [
  {
    id: '1',
    title: 'Beethoven Symphony No. 5 Masterclass',
    description: 'Master the iconic opening motif and develop your interpretation skills for this classical masterpiece.',
    duration: '8 weeks',
    format: 'Hybrid',
    price: 299,
    level: 'Intermediate',
    instructor: 'Dr. Sarah Chen',
    maxStudents: 15,
    currentStudents: 12,
    image: '/api/placeholder/400/300',
    category: 'Orchestra Excerpts'
  },
  {
    id: '2',
    title: 'Full Orchestra Fundamentals',
    description: 'Learn essential techniques for playing in a full orchestra setting, including balance, blend, and ensemble skills.',
    duration: '12 weeks',
    format: 'In-Person',
    price: 399,
    level: 'Beginner',
    instructor: 'Maestro James Wilson',
    maxStudents: 25,
    currentStudents: 18,
    image: '/api/placeholder/400/300',
    category: 'Full Orchestra Training'
  },
  {
    id: '3',
    title: 'Mozart String Quartet Workshop',
    description: 'Explore the elegance and precision required for Mozart\'s chamber music repertoire.',
    duration: '6 weeks',
    format: 'Zoom',
    price: 199,
    level: 'Advanced',
    instructor: 'Prof. Elena Rodriguez',
    maxStudents: 12,
    currentStudents: 8,
    image: '/api/placeholder/400/300',
    category: 'Orchestra Excerpts'
  },
  {
    id: '4',
    title: 'Orchestral Audition Preparation',
    description: 'Prepare for professional orchestra auditions with expert guidance and mock audition experiences.',
    duration: '10 weeks',
    format: 'Hybrid',
    price: 349,
    level: 'Advanced',
    instructor: 'Dr. Michael Thompson',
    maxStudents: 20,
    currentStudents: 16,
    image: '/api/placeholder/400/300',
    category: 'Full Orchestra Training'
  },
  {
    id: '5',
    title: 'Tchaikovsky Ballet Suite Workshop',
    description: 'Learn the romantic style and technical demands of Tchaikovsky\'s orchestral works.',
    duration: '8 weeks',
    format: 'In-Person',
    price: 279,
    level: 'Intermediate',
    instructor: 'Maestro Anna Petrov',
    maxStudents: 18,
    currentStudents: 14,
    image: '/api/placeholder/400/300',
    category: 'Orchestra Excerpts'
  },
  {
    id: '6',
    title: 'Contemporary Orchestra Techniques',
    description: 'Explore modern orchestral repertoire and extended techniques for contemporary music.',
    duration: '10 weeks',
    format: 'Hybrid',
    price: 329,
    level: 'Intermediate',
    instructor: 'Dr. Carlos Mendez',
    maxStudents: 16,
    currentStudents: 11,
    image: '/api/placeholder/400/300',
    category: 'Full Orchestra Training'
  }
]

export default function CourseCatalog() {
  const { scrollY } = useScroll()
  
  const sectionOpacity = useTransform(scrollY, [800, 1200], [0, 1])
  const sectionY = useTransform(scrollY, [800, 1200], [100, 0])

  const getFormatIcon = (format: Course['format']) => {
    switch (format) {
      case 'Zoom':
        return <Video className="h-4 w-4" />
      case 'In-Person':
        return <MapPin className="h-4 w-4" />
      case 'Hybrid':
        return <Users className="h-4 w-4" />
      default:
        return <Video className="h-4 w-4" />
    }
  }

  const getLevelColor = (level: Course['level']) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-800'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'Advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <motion.section
      id="courses"
      className="py-24 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30 relative overflow-hidden"
      style={{
        opacity: sectionOpacity,
        y: sectionY,
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-orchestra-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-orchestra-gold/5 rounded-full blur-3xl" />
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
            Course Catalog
          </h2>
          <p className="text-xl text-orchestra-brown/80 max-w-3xl mx-auto">
            Master the art of orchestral performance with our comprehensive training programs
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          {['All Courses', 'Orchestra Excerpts', 'Full Orchestra Training'].map((category, index) => (
            <motion.button
              key={category}
              className="px-6 py-3 rounded-full border-2 border-orchestra-gold/30 hover:border-orchestra-gold hover:bg-orchestra-gold/10 transition-all duration-300 text-orchestra-dark font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              className="group"
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
              <div className="card h-full overflow-hidden">
                {/* Course Image */}
                <div className="relative h-48 bg-gradient-to-br from-orchestra-gold/20 to-orchestra-brown/20 rounded-t-xl overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-20 w-20 text-orchestra-gold/40" />
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-orchestra-gold/90 text-orchestra-dark text-xs font-medium rounded-full">
                      {course.category}
                    </span>
                  </div>
                  
                  {/* Level Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <h3 className="text-xl font-serif text-orchestra-dark mb-3 group-hover:text-orchestra-gold transition-colors duration-300">
                    {course.title}
                  </h3>
                  
                  <p className="text-orchestra-brown/80 mb-4 line-clamp-3">
                    {course.description}
                  </p>

                  {/* Course Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm text-orchestra-brown/70">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getFormatIcon(course.format)}
                        <span>{course.format}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-orchestra-brown/70">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{course.currentStudents}/{course.maxStudents}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-orchestra-gold text-orchestra-gold" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructor */}
                  <p className="text-sm text-orchestra-brown/60 mb-4">
                    Instructor: <span className="font-medium text-orchestra-dark">{course.instructor}</span>
                  </p>

                  {/* Price and Registration */}
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-serif text-orchestra-gold">
                      ${course.price}
                    </div>
                    
                    <motion.button
                      className="btn-primary text-sm py-2 px-4"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Register Now
                    </motion.button>
                  </div>
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
            Ready to take your musical journey to the next level? Explore our full course catalog and find the perfect program for you.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/courses" className="btn-primary text-lg px-8 py-4">
              View All Courses
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  )
}
