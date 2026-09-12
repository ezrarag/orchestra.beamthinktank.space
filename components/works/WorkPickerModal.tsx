'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Upload, CheckCircle2, FileText, Music, Link2, Sparkles, X, AlertCircle } from 'lucide-react'
import {
  fetchWorks,
  searchWorksBySmartMatch,
  createWork,
  uploadWorkFileToStorage,
  linkRelatedWorks,
  type WorkDocument,
  type WorkCategory,
} from '@/lib/api/works'

import { Music as MusicIcon, FileText as FileTextIcon } from 'lucide-react'

interface WorkPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectWork: (work: WorkDocument) => void
  initialComposer?: string
  initialTitle?: string
}

export default function WorkPickerModal({
  isOpen,
  onClose,
  onSelectWork,
  initialComposer = '',
  initialTitle = '',
}: WorkPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search')
  const [composerInput, setComposerInput] = useState(initialComposer)
  const [titleInput, setTitleInput] = useState(initialTitle)
  const [categoryInput, setCategoryInput] = useState<WorkCategory>('standard_repertoire')
  const [matchedWorks, setMatchedWorks] = useState<WorkDocument[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<WorkDocument | null>(null)

  // New Work Form Files
  const [scoreFile, setScoreFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [midiFile, setMidiFile] = useState<File | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgressMsg, setUploadProgressMsg] = useState('')

  useEffect(() => {
    if (initialComposer) setComposerInput(initialComposer)
    if (initialTitle) setTitleInput(initialTitle)
  }, [initialComposer, initialTitle])

  // Real-time smart matching when typing composer or title
  useEffect(() => {
    if (!composerInput.trim() && !titleInput.trim()) {
      setMatchedWorks([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchWorksBySmartMatch(composerInput, titleInput)
      setMatchedWorks(results)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [composerInput, titleInput])

  if (!isOpen) return null

  const handleCreateNewWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleInput.trim() || !composerInput.trim()) return

    setIsUploading(true)
    setUploadProgressMsg('Initializing work entry in database...')

    // 1. Create work doc
    const newWorkId = await createWork({
      title: titleInput.trim(),
      composer: composerInput.trim(),
      category: categoryInput,
      relatedWorkIds: selectedMatch ? [selectedMatch.id] : [],
      instrumentation: [],
      tags: [categoryInput],
      files: { score: [], audioReference: [], midi: [] },
    })

    if (!newWorkId) {
      setIsUploading(false)
      alert('Failed to create work document')
      return
    }

    // 2. Upload score PDF if attached
    if (scoreFile) {
      setUploadProgressMsg('Uploading score PDF to Firebase Storage...')
      await uploadWorkFileToStorage(newWorkId, 'score', scoreFile)
    }

    // 3. Upload audio reference if attached
    if (audioFile) {
      setUploadProgressMsg('Uploading audio reference to Firebase Storage...')
      await uploadWorkFileToStorage(newWorkId, 'audioReference', audioFile)
    }

    // 4. Upload MIDI file if attached
    if (midiFile) {
      setUploadProgressMsg('Uploading MIDI file to Firebase Storage...')
      await uploadWorkFileToStorage(newWorkId, 'midi', midiFile)
    }

    // 5. If linked to an existing match, link reciprocal relationship
    if (selectedMatch) {
      await linkRelatedWorks(newWorkId, selectedMatch.id)
    }

    setIsUploading(false)

    // Fetch created work and invoke selection callback
    const { fetchWorkById } = await import('@/lib/api/works')
    const finalWork = await fetchWorkById(newWorkId)
    if (finalWork) {
      onSelectWork(finalWork)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-white/20 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto text-white"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full flex items-center justify-center">
            <MusicIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-white">
              Connect or Upload Work
            </h2>
            <p className="text-xs text-gray-300">
              Attach score PDFs, audio reference recordings, or MIDI files to canonical works.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Search Works Library
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Upload New Work & Files
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Search Composer or Work Title
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Schumann Violin Sonata No. 2, Op. 121"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Smart Matching Results */}
            {isSearching ? (
              <div className="text-center py-6 text-gray-400 text-sm">Searching library...</div>
            ) : matchedWorks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 p-2.5 rounded-lg border border-[#D4AF37]/30">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>Found {matchedWorks.length} matching work document(s) in library</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {matchedWorks.map((work) => (
                    <div
                      key={work.id}
                      onClick={() => {
                        onSelectWork(work)
                        onClose()
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 rounded-xl p-4 cursor-pointer transition-all flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-white text-base">{work.title}</h4>
                        <p className="text-xs text-purple-300">
                          Composer: {work.composer} {work.arranger ? `| Arranger: ${work.arranger}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{work.files.score.length} Score PDF(s)</span>
                          <span>•</span>
                          <span>{work.files.audioReference.length} Audio Ref(s)</span>
                          <span>•</span>
                          <span className="capitalize">{work.category.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <button className="bg-[#D4AF37] text-black font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-[#b8972e]">
                        Select Work
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : titleInput.trim() ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-gray-300 text-sm mb-3">No existing works matched "{titleInput}".</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-[#D4AF37] text-black font-semibold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload as New Work Entry
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Type a composer or title above to search standard repertoire and uploaded works.
              </div>
            )}
          </div>
        ) : (
          /* Create New Work Form */
          <form onSubmit={handleCreateNewWork} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Work Title *
                </label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Violin Sonata No. 2 in D minor, Op. 121"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Composer *
                </label>
                <input
                  type="text"
                  required
                  value={composerInput}
                  onChange={(e) => setComposerInput(e.target.value)}
                  placeholder="e.g. Robert Schumann"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as WorkCategory)}
                  className="w-full bg-slate-800 border border-white/15 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="standard_repertoire">Standard Repertoire</option>
                  <option value="new_composition">New Composition</option>
                  <option value="arrangement">Arrangement / Adaptation</option>
                </select>
              </div>
            </div>

            {/* Smart Matching Alert if typing reveals existing work */}
            {matchedWorks.length > 0 && !selectedMatch && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>Found similar works in library:</span>
                </div>
                <p className="mb-2">
                  To prevent duplicate entries, you can link this new arrangement to an existing work entry:
                </p>
                <div className="space-y-1">
                  {matchedWorks.slice(0, 2).map((mw) => (
                    <button
                      key={mw.id}
                      type="button"
                      onClick={() => setSelectedMatch(mw)}
                      className="block w-full text-left bg-black/40 hover:bg-black/60 p-2 rounded border border-amber-500/20 text-xs text-white"
                    >
                      Link as arrangement of: <span className="font-semibold text-[#D4AF37]">{mw.title}</span> ({mw.composer})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedMatch && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs text-green-300 flex justify-between items-center">
                <span>
                  Linked as related work to: <strong>{selectedMatch.title}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-white underline text-xs"
                >
                  Remove link
                </button>
              </div>
            )}

            {/* File Upload Section */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-purple-300">
                Upload Files to Firebase Storage
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Score PDF */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <FileTextIcon className="w-6 h-6 text-[#D4AF37] mx-auto mb-1" />
                  <span className="block text-xs font-semibold text-white mb-1">Score (PDF)</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setScoreFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="score-file-input"
                  />
                  <label
                    htmlFor="score-file-input"
                    className="cursor-pointer bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded-md text-white block line-clamp-1"
                  >
                    {scoreFile ? scoreFile.name : 'Choose Score'}
                  </label>
                </div>

                {/* Audio Reference */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <MusicIcon className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                  <span className="block text-xs font-semibold text-white mb-1">Audio Reference</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="audio-file-input"
                  />
                  <label
                    htmlFor="audio-file-input"
                    className="cursor-pointer bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded-md text-white block line-clamp-1"
                  >
                    {audioFile ? audioFile.name : 'Choose Audio'}
                  </label>
                </div>

                {/* MIDI File */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <Upload className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <span className="block text-xs font-semibold text-white mb-1">MIDI File</span>
                  <input
                    type="file"
                    accept=".mid,.midi"
                    onChange={(e) => setMidiFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="midi-file-input"
                  />
                  <label
                    htmlFor="midi-file-input"
                    className="cursor-pointer bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded-md text-white block line-clamp-1"
                  >
                    {midiFile ? midiFile.name : 'Choose MIDI'}
                  </label>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="text-center py-2 text-xs text-[#D4AF37] animate-pulse">
                {uploadProgressMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-[#D4AF37] hover:bg-[#b8972e] text-black font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 mt-4"
            >
              {isUploading ? 'Uploading & Creating Work...' : 'Create Work & Connect'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
