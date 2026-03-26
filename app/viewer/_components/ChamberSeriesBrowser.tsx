'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, ChevronRight, Disc3, Play, Sparkles, UserRound, X } from 'lucide-react'
import {
  groupChamberSeriesEntries,
  type ChamberSeriesComposer,
  type ChamberSeriesSourceEntry,
  type ChamberSeriesWork,
} from '@/lib/viewer/chamberSeries'

type Props = {
  items: ChamberSeriesSourceEntry[]
  onOpenVersion: (entry: ChamberSeriesSourceEntry) => void
  getProgressPercent: (contentId: string) => number
}

function buildBackgroundStyle(imageUrl?: string) {
  if (!imageUrl) return undefined
  return {
    backgroundImage: `linear-gradient(180deg, rgba(7,8,11,0.18) 0%, rgba(7,8,11,0.78) 58%, rgba(7,8,11,0.96) 100%), url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as const
}

export default function ChamberSeriesBrowser({ items, onOpenVersion, getProgressPercent }: Props) {
  const composers = useMemo(() => groupChamberSeriesEntries(items), [items])
  const [selectedComposerSlug, setSelectedComposerSlug] = useState<string | null>(null)
  const [selectedWorkSlug, setSelectedWorkSlug] = useState<string | null>(null)

  const selectedComposer = useMemo<ChamberSeriesComposer | null>(
    () => composers.find((composer) => composer.slug === selectedComposerSlug) ?? null,
    [composers, selectedComposerSlug],
  )

  const selectedWork = useMemo<ChamberSeriesWork | null>(
    () => selectedComposer?.works.find((work) => work.slug === selectedWorkSlug) ?? null,
    [selectedComposer, selectedWorkSlug],
  )

  useEffect(() => {
    if (!selectedComposerSlug) return
    const exists = composers.some((composer) => composer.slug === selectedComposerSlug)
    if (!exists) {
      setSelectedComposerSlug(null)
      setSelectedWorkSlug(null)
    }
  }, [composers, selectedComposerSlug])

  useEffect(() => {
    if (!selectedComposer || !selectedWorkSlug) return
    const exists = selectedComposer.works.some((work) => work.slug === selectedWorkSlug)
    if (!exists) {
      setSelectedWorkSlug(null)
    }
  }, [selectedComposer, selectedWorkSlug])

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-[#D4AF37]/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(255,255,255,0.02)_34%,rgba(0,0,0,0.34))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5D37A]">
              <Sparkles className="h-3.5 w-3.5" />
              Chamber Series v1
            </p>
            <h4 className="mt-3 text-2xl font-semibold text-white">Browse by composer first</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
              Chamber entries are aggregated in the presentation layer into composer narratives, work containers, and submitted recording versions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Composers</p>
              <p className="mt-1 text-xl font-semibold text-white">{composers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Works</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {composers.reduce((sum, composer) => sum + composer.workCount, 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Versions</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {composers.reduce((sum, composer) => sum + composer.versionCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {composers.map((composer) => {
          const hasImage = Boolean(composer.imageUrl)
          return (
            <button
              key={composer.slug}
              type="button"
              onClick={() => {
                setSelectedComposerSlug(composer.slug)
                setSelectedWorkSlug(null)
              }}
              className="group relative min-h-[300px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A0B0E] p-6 text-left transition hover:border-[#D4AF37]/55 hover:shadow-[0_26px_80px_rgba(0,0,0,0.45)]"
              style={hasImage ? buildBackgroundStyle(composer.imageUrl) : undefined}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,9,0.08),rgba(6,7,9,0.42)_38%,rgba(6,7,9,0.88)_78%,rgba(6,7,9,0.98)_100%)]" />
              <div className="absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.42),transparent_70%)] opacity-95" />
              <div
                className={`absolute inset-0 ${
                  hasImage
                    ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%)]'
                    : 'bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.22))]'
                }`}
              />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full border border-[#D4AF37]/35 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F5D37A]">
                    Composer
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                    {composer.marketLabel}
                  </span>
                </div>

                <div>
                  <h5 className="max-w-[18rem] text-[1.95rem] font-semibold leading-tight text-white">
                    {composer.name}
                  </h5>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
                    {composer.description || 'Narrative container for grouped Chamber Series recordings.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs text-white/70">
                    <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1">
                      {composer.workCount} {composer.workCount === 1 ? 'work' : 'works'}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1">
                      {composer.versionCount} {composer.versionCount === 1 ? 'version' : 'versions'}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1">
                      Latest {composer.latestRecordedLabel}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#F5D37A]">
                    Open composer
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedComposer ? (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/78 backdrop-blur-2xl"
            onClick={() => {
              setSelectedComposerSlug(null)
              setSelectedWorkSlug(null)
            }}
          />

          <div className="relative mx-auto mt-5 flex h-[calc(100vh-2.5rem)] w-[min(94vw,1220px)] flex-col overflow-hidden rounded-[32px] border border-[#D4AF37]/22 bg-[#050608]/95 shadow-[0_30px_120px_rgba(0,0,0,0.72)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.08),transparent_22%)]" />

            <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Chamber Series</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/72">
                  <span>Composers</span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                  <span className="truncate text-white">{selectedComposer.name}</span>
                  {selectedWork ? (
                    <>
                      <ChevronRight className="h-4 w-4 text-white/30" />
                      <span className="truncate text-white">{selectedWork.title}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkSlug(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {selectedWork ? 'Back to works' : 'Composer view'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComposerSlug(null)
                    setSelectedWorkSlug(null)
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-sm text-white/80 transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            <div className="relative grid flex-1 gap-5 overflow-hidden p-5 lg:grid-cols-[0.92fr,1.08fr]">
              <section className="flex min-h-0 flex-col gap-5 overflow-hidden">
                <div
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[#090A0D] p-6"
                  style={buildBackgroundStyle(selectedComposer.imageUrl)}
                >
                  <div className="rounded-[24px] border border-white/8 bg-black/45 p-5 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#F5D37A]">Narrative container</p>
                    <h4 className="mt-3 text-3xl font-semibold text-white">{selectedComposer.name}</h4>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
                      {selectedComposer.description || 'Composer-level container for Chamber Series works and submitted recording versions.'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/75">
                      <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                        {selectedComposer.workCount} works
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                        {selectedComposer.versionCount} submitted versions
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                        {selectedComposer.marketLabel}
                      </span>
                      <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                        Latest {selectedComposer.latestRecordedLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#F5D37A]">Works</p>
                      <h5 className="mt-1 text-xl font-semibold text-white">Choose a musical piece</h5>
                    </div>
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/70">
                      {selectedComposer.workCount} total
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {selectedComposer.works.map((work) => {
                      const isSelected = work.slug === selectedWorkSlug
                      return (
                        <button
                          key={work.slug}
                          type="button"
                          onClick={() => setSelectedWorkSlug(work.slug)}
                          className={`overflow-hidden rounded-[24px] border p-4 text-left transition ${
                            isSelected
                              ? 'border-[#D4AF37]/65 bg-[#D4AF37]/10'
                              : 'border-white/10 bg-black/30 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Work</p>
                              <h6 className="mt-1 text-lg font-semibold text-white">{work.title}</h6>
                            </div>
                            <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                              {work.versionCount} {work.versionCount === 1 ? 'version' : 'versions'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-white/70">
                            {work.description || 'Work-level container for submitted recording versions.'}
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#F5D37A]">
                            Open work
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>

              <section className="min-h-0 overflow-y-auto rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#F5D37A]">Versions</p>
                    <h5 className="mt-1 text-xl font-semibold text-white">
                      {selectedWork ? selectedWork.title : 'Select a work'}
                    </h5>
                  </div>
                  {selectedWork ? (
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/70">
                      {selectedWork.versionCount} total
                    </span>
                  ) : null}
                </div>

                {selectedWork ? (
                  <div className="space-y-3">
                    {selectedWork.versions.map((version) => {
                      const progressPercent = getProgressPercent(version.id)
                      return (
                        <article
                          key={version.id}
                          className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30"
                        >
                          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#F5D37A]">
                                  <Disc3 className="h-3.5 w-3.5" />
                                  Version
                                </span>
                                <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                                  {version.cityLabel}
                                </span>
                              </div>

                              <h6 className="mt-3 text-lg font-semibold text-white">{version.label}</h6>

                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/72">
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1">
                                  <UserRound className="h-3.5 w-3.5" />
                                  Submitted by {version.submittedBy}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {version.recordedLabel}
                                </span>
                              </div>

                              {version.participantNames.length > 0 ? (
                                <p className="mt-3 text-sm leading-6 text-white/70">
                                  Players: {version.participantNames.join(', ')}
                                </p>
                              ) : version.institutionName ? (
                                <p className="mt-3 text-sm leading-6 text-white/70">
                                  Institution: {version.institutionName}
                                </p>
                              ) : null}

                              <div className="mt-4">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                                  <div
                                    className="h-full rounded-full bg-[#D4AF37] transition-[width] duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/50">
                                  Watched {Math.round(progressPercent)}%
                                </p>
                              </div>
                            </div>

                            <div className="md:pl-4">
                              <button
                                type="button"
                                onClick={() => onOpenVersion(version.entry)}
                                className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/14 px-4 py-2 text-sm font-semibold text-[#F5D37A] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/22"
                              >
                                <Play className="h-4 w-4 fill-current" />
                                Play recording
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-black/20 px-6 text-center">
                    <div className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-4 text-[#F5D37A]">
                      <Disc3 className="h-7 w-7" />
                    </div>
                    <h6 className="mt-4 text-lg font-semibold text-white">Open a work to see versions</h6>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/65">
                      The version list is where submitted-by credits, recorded dates, and playback CTAs live in this Chamber Series flow.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
