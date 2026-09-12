'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Sparkles, Upload, FileText, CheckCircle2, Clock, Plus, X, Layers, Eye } from 'lucide-react'
import {
  fetchMediaAssetsForProject,
  uploadMediaAssetFileToStorage,
  updateMediaAssetStatus,
  type ProjectMediaAsset,
  type MediaType,
  type MediaStatus,
} from '@/lib/api/projectMediaAssets'
import { fetchWorkById, type WorkDocument } from '@/lib/api/works'

interface ProjectProductionTabProps {
  recordingProjectId: string
  workIds?: string[]
  onClose?: () => void
}

export default function ProjectProductionTab({
  recordingProjectId,
  workIds = [],
  onClose,
}: ProjectProductionTabProps) {
  const [mediaAssets, setMediaAssets] = useState<ProjectMediaAsset[]>([])
  const [attachedWorks, setAttachedWorks] = useState<WorkDocument[]>([])
  const [loading, setLoading] = useState(true)

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedWorkId, setSelectedWorkId] = useState<string>(workIds[0] || '')
  const [mediaType, setMediaType] = useState<MediaType>('video_overlay')
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [syncNotes, setSyncNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Fetch multimedia assets for project
      const assets = await fetchMediaAssetsForProject(recordingProjectId)
      setMediaAssets(assets)

      // Fetch attached works
      if (workIds.length > 0) {
        const worksPromises = workIds.map((id) => fetchWorkById(id))
        const resolvedWorks = (await Promise.all(worksPromises)).filter(
          (w): w is WorkDocument => w !== null
        )
        setAttachedWorks(resolvedWorks)
      }

      setLoading(false)
    }
    loadData()
  }, [recordingProjectId, workIds])

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetFile || !selectedWorkId) return

    setIsUploading(true)
    const newAsset = await uploadMediaAssetFileToStorage(
      recordingProjectId,
      selectedWorkId,
      mediaType,
      assetFile,
      syncNotes
    )

    setIsUploading(false)
    if (newAsset) {
      setMediaAssets((prev) => [newAsset, ...prev])
      setShowUploadModal(false)
      setAssetFile(null)
      setSyncNotes('')
    }
  }

  const handleStatusToggle = async (assetId: string, currentStatus: MediaStatus) => {
    const nextStatus: MediaStatus =
      currentStatus === 'concept'
        ? 'in_production'
        : currentStatus === 'in_production'
        ? 'ready'
        : 'concept'

    const ok = await updateMediaAssetStatus(assetId, nextStatus)
    if (ok) {
      setMediaAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, status: nextStatus } : a))
      )
    }
  }

  return (
    <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 sm:p-8 text-white space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-xl font-serif font-bold text-white">
              Multimedia Production Layer
            </h2>
          </div>
          <p className="text-xs text-gray-300">
            Attach video overlays, AR/VR projection assets, and lighting sync cues to project works.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-semibold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Add Production Asset
        </button>
      </div>

      {/* Attached Works Summary */}
      {attachedWorks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase text-purple-300">
            Attached Project Works ({attachedWorks.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachedWorks.map((work) => (
              <div key={work.id} className="bg-black/30 p-3 rounded-lg border border-white/5 text-xs">
                <span className="font-bold text-white block">{work.title}</span>
                <span className="text-gray-400 block">Composer: {work.composer}</span>
                <div className="flex items-center gap-2 mt-1 text-purple-300">
                  <span>{work.files.score.length} Score PDF(s)</span>
                  <span>•</span>
                  <span>{work.files.audioReference.length} Audio Ref(s)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Assets List */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Video className="w-4 h-4 text-purple-400" />
          <span>Production Media & AR/VR Assets</span>
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">Loading production assets...</div>
        ) : mediaAssets.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-300 text-sm mb-2">No multimedia production assets attached yet.</p>
            <p className="text-gray-400 text-xs mb-4">
              Upload video overlays, AR projections, or lighting cues to layer onto this performance.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3.5 py-2 rounded-lg font-semibold"
            >
              Upload First Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-400/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full capitalize">
                      {asset.type.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => handleStatusToggle(asset.id, asset.status)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize border transition-all ${
                        asset.status === 'ready'
                          ? 'bg-green-500/20 border-green-500/40 text-green-300'
                          : asset.status === 'in_production'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      }`}
                    >
                      Status: {asset.status.replace('_', ' ')}
                    </button>
                  </div>

                  <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">
                    {asset.file.filename}
                  </h4>

                  {asset.syncNotes && (
                    <p className="text-xs text-gray-300 italic mb-3">
                      "{asset.syncNotes}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                  <a
                    href={asset.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Asset
                  </a>
                  <span className="text-gray-400 text-[10px]">
                    {new Date(asset.file.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Asset Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-white"
            >
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-lg font-serif font-bold text-white mb-1">
                Upload Multimedia Production Asset
              </h3>
              <p className="text-xs text-gray-300 mb-4">
                Store video overlays, AR/VR projection files, or lighting cue sheets in Firebase Storage.
              </p>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                    Target Work
                  </label>
                  <select
                    value={selectedWorkId}
                    onChange={(e) => setSelectedWorkId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {attachedWorks.length > 0 ? (
                      attachedWorks.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title} ({w.composer})
                        </option>
                      ))
                    ) : (
                      <option value="general_project_work">General Project Performance</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                    Asset Type
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as MediaType)}
                    className="w-full bg-slate-800 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="video_overlay">Video Overlay / Background Video</option>
                    <option value="ar_projection">AR Projection Asset (Spatial)</option>
                    <option value="vr_projection">VR Environment Asset</option>
                    <option value="lighting_cue">Lighting Cue Sheet</option>
                    <option value="other">Other Production File</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                    Select File *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#D4AF37] file:text-black hover:file:bg-[#b8972e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                    Performance Sync / Timing Notes
                  </label>
                  <textarea
                    rows={2}
                    value={syncNotes}
                    onChange={(e) => setSyncNotes(e.target.value)}
                    placeholder="e.g. Trigger AR overlay at measure 42 during tempo change..."
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-[#D4AF37] hover:bg-[#b8972e] text-black font-semibold text-xs py-2.5 rounded-xl transition-all shadow disabled:opacity-50 mt-2"
                >
                  {isUploading ? 'Uploading Asset to Storage...' : 'Upload & Attach Asset'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
