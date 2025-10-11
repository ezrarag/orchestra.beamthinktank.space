'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Download, 
  Calendar, 
  MapPin, 
  Users, 
  Music,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Video,
  FileText
} from 'lucide-react'

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'document'
  title: string
  description: string
  url: string
  thumbnail?: string
  date: string
  category: 'rehearsal' | 'performance' | 'document' | 'promotional'
}

const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    title: 'First Rehearsal - Strings Section',
    description: 'The string section working on Montgomery Variations during our first rehearsal',
    url: '/images/bdso-rehearsal-1.jpg',
    thumbnail: '/images/bdso-rehearsal-1-thumb.jpg',
    date: '2025-01-15',
    category: 'rehearsal'
  },
  {
    id: '2',
    type: 'video',
    title: 'Montgomery Variations - Movement I',
    description: 'Excerpt from Margaret Bonds Montgomery Variations, Movement I',
    url: '/videos/montgomery-variations-movement-1.mp4',
    thumbnail: '/images/montgomery-variations-thumb.jpg',
    date: '2025-01-18',
    category: 'performance'
  },
  {
    id: '3',
    type: 'document',
    title: 'Rehearsal Schedule - January 2025',
    description: 'Complete rehearsal schedule for the Black Diaspora Symphony Orchestra project',
    url: '/documents/bdso-rehearsal-schedule.pdf',
    date: '2025-01-10',
    category: 'document'
  },
  {
    id: '4',
    type: 'image',
    title: 'Winds Section Rehearsal',
    description: 'Brass and woodwind sections collaborating on orchestral passages',
    url: '/images/bdso-rehearsal-2.jpg',
    thumbnail: '/images/bdso-rehearsal-2-thumb.jpg',
    date: '2025-01-22',
    category: 'rehearsal'
  },
  {
    id: '5',
    type: 'video',
    title: 'Project Announcement Video',
    description: 'Official announcement of the Black Diaspora Symphony Orchestra collaboration',
    url: '/videos/bdso-announcement.mp4',
    thumbnail: '/images/bdso-announcement-thumb.jpg',
    date: '2025-01-05',
    category: 'promotional'
  },
  {
    id: '6',
    type: 'document',
    title: 'Musician Contract Template',
    description: 'Standard contract template for BDSO project musicians',
    url: '/documents/musician-contract-template.pdf',
    date: '2025-01-08',
    category: 'document'
  },
  {
    id: '7',
    type: 'image',
    title: 'Full Orchestra Rehearsal',
    description: 'Complete ensemble working together on the full orchestration',
    url: '/images/bdso-full-orchestra.jpg',
    thumbnail: '/images/bdso-full-orchestra-thumb.jpg',
    date: '2025-01-29',
    category: 'rehearsal'
  },
  {
    id: '8',
    type: 'video',
    title: 'Behind the Scenes - Musician Interviews',
    description: 'Interviews with musicians about their experience with the BDSO project',
    url: '/videos/musician-interviews.mp4',
    thumbnail: '/images/musician-interviews-thumb.jpg',
    date: '2025-02-01',
    category: 'promotional'
  }
]

const categories = [
  { id: 'all', label: 'All Media', icon: ImageIcon },
  { id: 'rehearsal', label: 'Rehearsals', icon: Music },
  { id: 'performance', label: 'Performances', icon: Play },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'promotional', label: 'Promotional', icon: Calendar }
]

export default function ProjectMediaGallery() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const filteredMedia = selectedCategory === 'all' 
    ? mockMediaItems 
    : mockMediaItems.filter(item => item.category === selectedCategory)

  const openMedia = (item: MediaItem, index: number) => {
    setSelectedMedia(item)
    setCurrentIndex(index)
  }

  const closeMedia = () => {
    setSelectedMedia(null)
  }

  const navigateMedia = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredMedia.length
      : (currentIndex - 1 + filteredMedia.length) % filteredMedia.length
    
    setCurrentIndex(newIndex)
    setSelectedMedia(filteredMedia[newIndex])
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-5 h-5" />
      case 'document':
        return <FileText className="w-5 h-5" />
      default:
        return <ImageIcon className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rehearsal':
        return 'from-purple-500 to-purple-600'
      case 'performance':
        return 'from-green-500 to-green-600'
      case 'document':
        return 'from-blue-500 to-blue-600'
      case 'promotional':
        return 'from-orange-500 to-orange-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <ImageIcon className="w-8 h-8 mr-3 text-purple-400" />
          Project Media Gallery
        </h2>
        <div className="text-gray-300 text-sm">
          {filteredMedia.length} {filteredMedia.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
            }`}
          >
            <category.icon className="w-4 h-4 mr-2" />
            {category.label}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMedia.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group cursor-pointer"
            onClick={() => openMedia(item, index)}
          >
            <div className="bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all duration-300">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                {item.type === 'image' ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                ) : item.type === 'video' ? (
                  <div className="w-full h-full bg-gradient-to-br from-green-600/20 to-teal-600/20 flex items-center justify-center">
                    <Play className="w-12 h-12 text-gray-400" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'video' ? (
                      <Play className="w-8 h-8 text-white" />
                    ) : (
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        {getMediaIcon(item.type)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getCategoryColor(item.category)} text-white`}>
                  {categories.find(cat => cat.id === item.category)?.label}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-500 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-gray-400">
                    {getMediaIcon(item.type)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No media found</h3>
          <p className="text-gray-400">
            No {selectedCategory === 'all' ? '' : selectedCategory} media items available yet.
          </p>
        </div>
      )}

      {/* Media Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeMedia}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedMedia.title}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {new Date(selectedMedia.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {filteredMedia.length > 1 && (
                    <>
                      <button
                        onClick={() => navigateMedia('prev')}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigateMedia('next')}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={closeMedia}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Media Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-300 leading-relaxed">
                    {selectedMedia.description}
                  </p>
                </div>

                {/* Media Display */}
                <div className="bg-black/20 rounded-lg p-8 text-center">
                  {selectedMedia.type === 'image' ? (
                    <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Image preview would be displayed here</p>
                      </div>
                    </div>
                  ) : selectedMedia.type === 'video' ? (
                    <div className="aspect-video bg-gradient-to-br from-green-600/20 to-teal-600/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Video player would be embedded here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Document preview would be displayed here</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-center mt-6">
                  <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
