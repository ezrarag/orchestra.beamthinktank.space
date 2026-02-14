'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import Footer from '@/components/Footer'
import { getChamberProjectDetail, type ChamberVersion } from '@/lib/chamberProjects'
import StemSyncPlayer from '@/components/StemSyncPlayer'

const formatDate = (date: Date | null): string => {
  if (!date) return 'Date TBD'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function ChamberProjectPage() {
  const params = useParams()
  const projectKey = params.slug as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState('')
  const [composer, setComposer] = useState<string | undefined>()
  const [instrumentation, setInstrumentation] = useState<string | undefined>()
  const [projectDescription, setProjectDescription] = useState<string | undefined>()
  const [versions, setVersions] = useState<ChamberVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const detail = await getChamberProjectDetail(projectKey)

        if (!mounted) return

        if (!detail) {
          setError('Project not found')
          return
        }

        setProjectTitle(detail.project.title)
        setComposer(detail.project.composer)
        setInstrumentation(detail.project.instrumentation)
        setProjectDescription(detail.project.description)
        setVersions(detail.versions)

        if (detail.versions.length > 0) {
          setSelectedVersionId(detail.versions[0].id)
        }
      } catch (loadError) {
        console.error('Error loading chamber project:', loadError)
        if (mounted) {
          setError('Failed to load project')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [projectKey])

  const selectedVersion = useMemo(() => {
    return versions.find((version) => version.id === selectedVersionId) ?? null
  }, [versions, selectedVersionId])

  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#D4AF37]" />
      </div>
    )
  }

  if (error || !projectTitle) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">{error || 'Project not found'}</h1>
          <Link href="/studio/chamber" className="text-[#D4AF37] hover:text-[#B8941F]">
            Return to Chamber Series
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <section className="border-b border-white/10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/studio/chamber" className="mb-6 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F]">
            <ArrowLeft className="h-4 w-4" />
            Back to Chamber Series
          </Link>

          <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">{projectTitle}</h1>
          {composer && <p className="text-lg text-white/80">Composer: {composer}</p>}
          {instrumentation && <p className="mt-1 text-lg text-white/80">Instrumentation: {instrumentation}</p>}
          {projectDescription && <p className="mt-4 max-w-3xl text-white/70">{projectDescription}</p>}
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {versions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="text-white/70">No versions are available for this project yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-white">
                  <Calendar className="h-5 w-5 text-[#D4AF37]" />
                  Versions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {versions.map((version) => {
                    const selected = version.id === selectedVersionId
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => handleVersionChange(version.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          selected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F0D27B]'
                            : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                        }`}
                      >
                        {version.label} ({formatDate(version.createdAt)})
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedVersion && (
                <>
                  <StemSyncPlayer
                    key={selectedVersion.id}
                    masterUrl={selectedVersion.hlsManifestUrl || selectedVersion.masterVideoUrl}
                    audioTracks={selectedVersion.audioTracks}
                  />
                  {selectedVersion.notes && (
                    <p className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/75">
                      {selectedVersion.notes}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
