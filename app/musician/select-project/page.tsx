'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Music, ArrowRight, Plus, CheckCircle, Sparkles, X, FileText, Layers, Video } from 'lucide-react'
import Image from 'next/image'
import { useUserRole } from '@/lib/hooks/useUserRole'
import {
  fetchRecordingProjects,
  createRecordingProject,
  type RecordingProject,
  type EnsembleType,
  type FundingPath,
} from '@/lib/api/recordingProjects'
import { createCommunityBookingInterest } from '@/lib/api/bookings'
import WorkPickerModal from '@/components/works/WorkPickerModal'
import ProjectProductionTab from '@/components/works/ProjectProductionTab'
import { type WorkDocument } from '@/lib/api/works'

const DEFAULT_PROJECT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/pexels-afroromanzo-4028878.jpg?alt=media&token=b95bbe32-cc29-4ff7-815a-3dd558efa561'

export default function SelectProjectPage() {
  const router = useRouter()
  const { user } = useUserRole()
  const [projects, setProjects] = useState<RecordingProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Start Project Modal State
  const [showStartModal, setShowStartModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    arranger: '',
    ensembleType: 'full_orchestra' as EnsembleType,
    city: 'Milwaukee',
    venueRef: '',
    description: '',
    fundingPath: 'unfunded' as FundingPath,
  })

  // Work Picker State
  const [showWorkPicker, setShowWorkPicker] = useState(false)
  const [selectedWork, setSelectedWork] = useState<WorkDocument | null>(null)

  // Production Tab Drawer State
  const [productionProject, setProductionProject] = useState<RecordingProject | null>(null)

  // Join Interest Modal State
  const [joinModalProject, setJoinModalProject] = useState<RecordingProject | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [joinNote, setJoinNote] = useState('')
  const [joinSuccess, setJoinSuccess] = useState(false)

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true)
      const data = await fetchRecordingProjects('open_for_roster')
      setProjects(data)
      setLoadingProjects(false)
    }
    loadProjects()
  }, [])

  const handleSelectProject = (project: RecordingProject) => {
    if (project.id === 'black-diaspora-symphony') {
      router.push('/training/contract-projects/black-diaspora-symphony')
      return
    }
    setJoinModalProject(project)
  }

  const handleStartProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.composer) return

    setIsSubmitting(true)
    const newProjectId = await createRecordingProject({
      title: formData.title,
      composer: formData.composer,
      arranger: formData.arranger || undefined,
      ensembleType: formData.ensembleType,
      ownerType: user ? 'participant' : 'beam_ensemble',
      ownerRef: user?.uid,
      city: formData.city,
      venueRef: formData.venueRef || undefined,
      status: 'pending_review',
      rolesNeeded: [
        { role: 'Conductor', filled: false },
        { role: 'Violin 1', filled: false },
        { role: 'Recording Engineer', filled: false },
        { role: 'Business / IP Manager', filled: false },
      ],
      workIds: selectedWork ? [selectedWork.id] : [],
      fundingPath: formData.fundingPath,
      visibility: 'public',
      description: formData.description,
    })

    setIsSubmitting(false)
    if (newProjectId) {
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        setShowStartModal(false)
        setSelectedWork(null)
        setFormData({
          title: '',
          composer: '',
          arranger: '',
          ensembleType: 'full_orchestra',
          city: 'Milwaukee',
          venueRef: '',
          description: '',
          fundingPath: 'unfunded',
        })
      }, 2000)
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinModalProject) return

    setIsSubmitting(true)
    try {
      await createCommunityBookingInterest({
        orchestraId: joinModalProject.id,
        orchestraName: joinModalProject.title,
        instrument: selectedRole || 'Orchestral Musician',
      })
      setJoinSuccess(true)
      setTimeout(() => {
        setJoinSuccess(false)
        setJoinModalProject(null)
        setSelectedRole('')
        setJoinNote('')
      }, 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto w-full pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white mb-3">
            BEAM Recording Projects
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto">
            Join an open roster recording project or submit a proposal with score PDFs, audio references, and multimedia AR/VR assets.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowStartModal(true)}
              className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#b8972e] text-black font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Start a Recording Project
            </button>
            <button
              onClick={() => setShowWorkPicker(true)}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-xl transition-all border border-white/20"
            >
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              Works Library & Uploads
            </button>
          </div>
        </motion.div>

        {/* Projects List */}
        <div className="space-y-4">
          {loadingProjects ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-gray-300 text-lg mb-4">No open recording project calls available right now.</p>
              <p className="text-gray-400 text-sm mb-6">
                Be the first to initiate a new project proposal for your city or ensemble.
              </p>
              <button
                onClick={() => setShowStartModal(true)}
                className="bg-[#D4AF37] text-black font-semibold px-5 py-2.5 rounded-lg text-sm"
              >
                Propose a Project
              </button>
            </div>
          ) : (
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#D4AF37]/50 rounded-2xl p-6 transition-all duration-300 group"
              >
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="relative w-full sm:w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                    <Image
                      src={project.imageUrl || DEFAULT_PROJECT_IMAGE}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize">
                        {project.ensembleType.replace('_', ' ')}
                      </span>
                      <span className="bg-white/10 text-white/80 text-xs px-2.5 py-0.5 rounded-full">
                        {project.city}
                      </span>
                      {project.workIds && project.workIds.length > 0 && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {project.workIds.length} Linked Work(s)
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-purple-200 mb-2">
                      Composer: {project.composer} {project.arranger ? `| Arranger: ${project.arranger}` : ''}
                    </p>
                    {project.description && (
                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">{project.description}</p>
                    )}

                    {project.rolesNeeded.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.rolesNeeded.map((r, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded-md border ${
                              r.filled
                                ? 'bg-green-500/10 border-green-500/30 text-green-300 line-through'
                                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            }`}
                          >
                            {r.role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-3">
                    <button
                      onClick={() => handleSelectProject(project)}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Join Project Roster</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      onClick={() => setProductionProject(project)}
                      className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-xs text-gray-300 hover:text-white px-3.5 py-1.5 rounded-lg transition-all border border-white/10 flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Multimedia & AR/VR</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Start Project Modal */}
      <AnimatePresence>
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowStartModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              {submitSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Proposal Submitted!</h3>
                  <p className="text-gray-300 text-sm">
                    Your recording project proposal has been placed in the BEAM admin queue (`pending_review`).
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-serif font-bold text-white mb-2">
                    Propose a Recording Project
                  </h2>
                  <p className="text-gray-300 text-sm mb-6">
                    Initiate a BEAM standard recording session cut with assigned roles and linked score/audio works.
                  </p>

                  <form onSubmit={handleStartProjectSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Montgomery Variations Recording Session"
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                          Composer *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.composer}
                          onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                          placeholder="e.g. Margaret Bonds"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                          Arranger / Adapter
                        </label>
                        <input
                          type="text"
                          value={formData.arranger}
                          onChange={(e) => setFormData({ ...formData, arranger: e.target.value })}
                          placeholder="Optional"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    {/* Connect Score / Work Section */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold uppercase text-purple-300">
                          Linked Work & Score File
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowWorkPicker(true)}
                          className="text-xs text-[#D4AF37] hover:underline font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {selectedWork ? 'Change Work' : 'Search / Upload Work'}
                        </button>
                      </div>

                      {selectedWork ? (
                        <div className="bg-black/30 p-3 rounded-lg border border-purple-500/30 text-xs">
                          <span className="font-bold text-white block">{selectedWork.title}</span>
                          <span className="text-gray-300 block">Composer: {selectedWork.composer}</span>
                          <span className="text-purple-300 text-[10px] block mt-1">
                            {selectedWork.files.score.length} Score PDF(s) attached
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          No score work linked yet. Click to search existing works or upload score PDFs.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                          Ensemble Type
                        </label>
                        <select
                          value={formData.ensembleType}
                          onChange={(e) =>
                            setFormData({ ...formData, ensembleType: e.target.value as EnsembleType })
                          }
                          className="w-full bg-slate-800 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="full_orchestra">Full Orchestra</option>
                          <option value="string_orchestra">String Orchestra</option>
                          <option value="chamber">Chamber Ensemble</option>
                          <option value="choir_orchestra">Choir & Orchestra</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                          Target City
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="e.g. Milwaukee, Orlando"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Venue / Location Address
                      </label>
                      <input
                        type="text"
                        value={formData.venueRef}
                        onChange={(e) => setFormData({ ...formData, venueRef: e.target.value })}
                        placeholder="e.g. Steinway Gallery Orlando"
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Project Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Details about session schedule, score availability, and production goals..."
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#D4AF37] hover:bg-[#b8972e] text-black font-semibold py-3 rounded-xl transition-all shadow-lg mt-4 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting Proposal...' : 'Submit Project Proposal'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Work Picker Modal Component */}
      <WorkPickerModal
        isOpen={showWorkPicker}
        onClose={() => setShowWorkPicker(false)}
        onSelectWork={(work) => {
          setSelectedWork(work)
          setFormData((prev) => ({
            ...prev,
            title: prev.title || work.title,
            composer: prev.composer || work.composer,
            arranger: prev.arranger || work.arranger || '',
          }))
        }}
        initialComposer={formData.composer}
        initialTitle={formData.title}
      />

      {/* Production & Multimedia Drawer/Modal */}
      <AnimatePresence>
        {productionProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setProductionProject(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <ProjectProductionTab
                recordingProjectId={productionProject.id}
                workIds={productionProject.workIds}
                onClose={() => setProductionProject(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Roster Interest Modal */}
      <AnimatePresence>
        {joinModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setJoinModalProject(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              {joinSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-1">Interest Registered!</h3>
                  <p className="text-gray-300 text-sm">
                    Your roster application for {joinModalProject.title} has been logged.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-serif font-bold text-white mb-1">
                    Apply for Roster Call
                  </h2>
                  <p className="text-gray-300 text-sm mb-4">
                    Project: <span className="text-[#D4AF37] font-semibold">{joinModalProject.title}</span>
                  </p>

                  <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Select Your Role / Instrument *
                      </label>
                      <select
                        required
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full bg-slate-800 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="">-- Choose Role --</option>
                        <option value="Conductor">Conductor</option>
                        <option value="Violin 1">Violin 1</option>
                        <option value="Violin 2">Violin 2</option>
                        <option value="Viola">Viola</option>
                        <option value="Cello">Cello</option>
                        <option value="Double Bass">Double Bass</option>
                        <option value="Flute">Flute</option>
                        <option value="Oboe">Oboe</option>
                        <option value="Clarinet">Clarinet</option>
                        <option value="Bassoon">Bassoon</option>
                        <option value="French Horn">French Horn</option>
                        <option value="Trumpet">Trumpet</option>
                        <option value="Trombone">Trombone</option>
                        <option value="Tuba">Tuba</option>
                        <option value="Percussion">Percussion</option>
                        <option value="Recording Engineer">Recording Engineer</option>
                        <option value="Business / IP Manager">Business / IP Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                        Notes / Background
                      </label>
                      <textarea
                        rows={3}
                        value={joinNote}
                        onChange={(e) => setJoinNote(e.target.value)}
                        placeholder="Include relevant performance or recording experience..."
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
