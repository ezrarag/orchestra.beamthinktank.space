'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  FileText, 
  CheckCircle2, 
  Circle,
  Lightbulb,
  FileCheck,
  UserCheck,
  Camera,
  DollarSign
} from 'lucide-react'
import DocumentSigner from './DocumentSigner'

interface SetupGuideProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onDocumentComplete?: (documentType: 'contract' | 'w9' | 'mediaRelease') => void
}

interface DocumentStatus {
  contract: boolean
  w9: boolean
  mediaRelease: boolean
}

interface SectionStatus {
  profile: boolean
  documents: boolean
  verification: boolean
  media: boolean
}

export default function SetupGuide({ isOpen, onClose, user, onDocumentComplete }: SetupGuideProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['documents']))
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>({
    contract: false,
    w9: false,
    mediaRelease: false
  })
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    profile: false,
    documents: false,
    verification: false,
    media: false
  })
  const [activeDocumentSigner, setActiveDocumentSigner] = useState<'contract' | 'w9' | 'mediaRelease' | null>(null)

  // Load saved document status from localStorage
  useEffect(() => {
    if (user?.uid) {
      const saved = localStorage.getItem(`documentStatus_${user.uid}`)
      if (saved) {
        try {
          setDocumentStatus(JSON.parse(saved))
        } catch (e) {
          console.error('Error loading document status:', e)
        }
      }
    }
  }, [user?.uid])

  // Save document status to localStorage
  useEffect(() => {
    if (user?.uid) {
      localStorage.setItem(`documentStatus_${user.uid}`, JSON.stringify(documentStatus))
      
      // Update section status based on document completion
      const allDocumentsComplete = documentStatus.contract && documentStatus.w9 && documentStatus.mediaRelease
      setSectionStatus(prev => ({
        ...prev,
        documents: allDocumentsComplete
      }))
    }
  }, [documentStatus, user?.uid])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleDocumentSign = (documentType: 'contract' | 'w9' | 'mediaRelease') => {
    setActiveDocumentSigner(documentType)
  }

  const handleDocumentComplete = (documentType: 'contract' | 'w9' | 'mediaRelease') => {
    setDocumentStatus(prev => ({
      ...prev,
      [documentType]: true
    }))
    setActiveDocumentSigner(null)
    onDocumentComplete?.(documentType)
  }

  // Calculate overall progress
  const totalTasks = 8 // Profile (1) + Documents (3) + Verification (1) + Media (1) + Other (2)
  const completedTasks = 
    (sectionStatus.profile ? 1 : 0) +
    (documentStatus.contract ? 1 : 0) +
    (documentStatus.w9 ? 1 : 0) +
    (documentStatus.mediaRelease ? 1 : 0) +
    (sectionStatus.verification ? 1 : 0) +
    (sectionStatus.media ? 1 : 0)
  const progress = (completedTasks / totalTasks) * 100

  const sections = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      icon: UserCheck,
      tasks: [
        { id: 'profile', label: 'Update your profile information', completed: sectionStatus.profile }
      ]
    },
    {
      id: 'documents',
      title: 'Sign Required Documents',
      icon: FileCheck,
      tasks: [
        { id: 'contract', label: 'Sign Performance Contract', completed: documentStatus.contract, action: () => handleDocumentSign('contract') },
        { id: 'w9', label: 'Complete W-9 Form', completed: documentStatus.w9, action: () => handleDocumentSign('w9') },
        { id: 'mediaRelease', label: 'Sign Media Release Form', completed: documentStatus.mediaRelease, action: () => handleDocumentSign('mediaRelease') }
      ]
    },
    {
      id: 'verification',
      title: 'Verify Student or Alumni Status',
      icon: CheckCircle2,
      tasks: [
        { id: 'verification', label: 'Verify your student or alumni status', completed: sectionStatus.verification }
      ]
    },
    {
      id: 'media',
      title: 'Upload Media Assets',
      icon: Camera,
      tasks: [
        { id: 'media', label: 'Upload your headshot photo', completed: sectionStatus.media }
      ]
    }
  ]

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <div className="absolute top-16 right-4 md:right-8 w-full max-w-md pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-orchestra-cream/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-orchestra-gold/30 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-orchestra-gold/20 to-orchestra-gold/10 px-6 py-4 border-b border-orchestra-gold/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orchestra-gold/20 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-orchestra-dark" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-orchestra-dark">Setup Guide</h3>
                        <p className="text-xs text-orchestra-brown/70">Recommendation</p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      aria-label="Close setup guide"
                    >
                      <X className="h-5 w-5 text-orchestra-dark" />
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-orchestra-brown/80 mb-1">
                      <span>Progress</span>
                      <span>{completedTasks} of {totalTasks} tasks</span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-orchestra-gold to-orchestra-gold/80 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <div className="p-4 space-y-2">
                    {sections.map((section) => {
                      const isExpanded = expandedSections.has(section.id)
                      const Icon = section.icon
                      const sectionCompleted = section.tasks.every(task => task.completed)
                      
                      return (
                        <div
                          key={section.id}
                          className="bg-white/50 rounded-lg border border-orchestra-gold/20 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 ${sectionCompleted ? 'text-orchestra-gold' : 'text-orchestra-brown/60'}`} />
                              <span className="font-semibold text-orchestra-dark text-left">{section.title}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-orchestra-brown/60" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-orchestra-brown/60" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-2">
                                  {section.tasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center gap-3 py-2"
                                    >
                                      {task.completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-orchestra-gold flex-shrink-0" />
                                      ) : (
                                        <Circle className="h-5 w-5 text-orchestra-brown/40 flex-shrink-0" />
                                      )}
                                      <span className={`flex-1 text-sm ${task.completed ? 'text-orchestra-brown/70 line-through' : 'text-orchestra-dark'}`}>
                                        {task.label}
                                      </span>
                                      {!task.completed && 'action' in task && task.action && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            task.action?.()
                                          }}
                                          className="px-3 py-1.5 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark text-xs font-semibold rounded-lg transition-colors"
                                        >
                                          Sign
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Signer Modal */}
      {activeDocumentSigner && user && (
        <DocumentSigner
          isOpen={!!activeDocumentSigner}
          onClose={() => setActiveDocumentSigner(null)}
          documentType={activeDocumentSigner}
          musicianName={user.displayName || user.email?.split('@')[0] || 'Musician'}
          musicianEmail={user.email || ''}
          onComplete={(docType) => {
            handleDocumentComplete(docType)
            // Close the document signer after a brief delay to show success
            setTimeout(() => {
              setActiveDocumentSigner(null)
            }, 1500)
          }}
        />
      )}
    </>
  )
}

