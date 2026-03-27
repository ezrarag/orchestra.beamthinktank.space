import Link from 'next/link'
import { ArrowUpRight, Calendar, Disc3, LibraryBig, Microscope, Users } from 'lucide-react'
import { getFirestoreTimestampMillis, truncateChamberResearchExcerpt } from '@/lib/chamberWorks'
import type { ChamberResearchRef, ChamberWorkDocument } from '@/lib/types/chamber'

export type ChamberViewerTab = 'performance' | 'research' | 'critique' | 'otherVersions'

type ChamberPlaybackStory = {
  title: string
  description: string
  composer?: string
  composerName?: string
  workTitle?: string
  versionLabel?: string
  submittedBy?: string
  institutionName?: string
  recordedLabel?: string
  participantNames?: string[]
  relatedVersionCount: number
  researchStatus?: string
}

type Props = {
  activeTab: ChamberViewerTab
  onTabChange: (tab: ChamberViewerTab) => void
  story: ChamberPlaybackStory | null
  work: ChamberWorkDocument | null
  researchLoadState: 'idle' | 'loading' | 'ready' | 'error'
  researchError?: string | null
  adminResearchHref?: string | null
}

const TAB_OPTIONS: Array<{ id: ChamberViewerTab; label: string }> = [
  { id: 'performance', label: 'Performance' },
  { id: 'research', label: 'Research' },
  { id: 'critique', label: 'Critique' },
  { id: 'otherVersions', label: 'Other versions' },
]

function getSourceLabel(source: ChamberResearchRef['source']): string {
  if (source === 'doaj') return 'DOAJ'
  if (source === 'europeana') return 'Europeana'
  if (source === 'jstor') return 'JSTOR'
  if (source === 'hathitrust') return 'HathiTrust'
  return 'Manual'
}

function renderResearchSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`research-skeleton-${index + 1}`}
          className="animate-pulse rounded-[24px] border border-white/10 bg-black/25 p-4"
        >
          <div className="h-4 w-20 rounded-full bg-white/10" />
          <div className="mt-4 h-6 w-3/4 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/10" />
          <div className="mt-4 space-y-2">
            <div className="h-3.5 rounded bg-white/10" />
            <div className="h-3.5 rounded bg-white/10" />
            <div className="h-3.5 w-5/6 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ChamberViewerPanels({
  activeTab,
  onTabChange,
  story,
  work,
  researchLoadState,
  researchError,
  adminResearchHref,
}: Props) {
  const researchRefs = [...(work?.researchRefs ?? [])].sort(
    (a, b) => getFirestoreTimestampMillis(b.addedAt) - getFirestoreTimestampMillis(a.addedAt),
  )
  const composerLabel = story?.composerName || story?.composer || work?.composerName || 'Composer metadata pending'
  const workLabel = story?.workTitle || work?.workTitle || 'Work metadata pending'

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#F5D37A]">Chamber viewer</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{workLabel}</h3>
              <p className="mt-2 text-sm text-white/70">{composerLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/14 text-[#F5D37A]'
                      : 'border-white/12 bg-black/20 text-white/72 hover:border-white/28 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'performance' ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <article className="rounded-[24px] border border-white/10 bg-black/25 p-5">
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#F5D37A]">
                  <Disc3 className="h-3.5 w-3.5" />
                  Performance
                </p>
                <h4 className="mt-3 text-xl font-semibold text-white">
                  {story?.versionLabel || story?.title || 'Selected recording'}
                </h4>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  {story?.description || 'Performance notes for this chamber work will appear here as metadata expands.'}
                </p>
                {story?.participantNames && story.participantNames.length > 0 ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#F5D37A]">
                      <Users className="h-3.5 w-3.5" />
                      Participants
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {story.participantNames.join(', ')}
                    </p>
                  </div>
                ) : null}
              </article>

              <div className="grid gap-4">
                <article className="rounded-[24px] border border-white/10 bg-black/25 p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#F5D37A]">Work context</p>
                  <div className="mt-4 grid gap-3 text-sm text-white/78">
                    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Version</p>
                      <p className="mt-1 font-medium text-white">{story?.versionLabel || story?.title || 'Not labeled yet'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Institution</p>
                      <p className="mt-1 font-medium text-white">{story?.institutionName || 'Not listed'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/45">
                        <Calendar className="h-3.5 w-3.5" />
                        Recorded
                      </p>
                      <p className="mt-1 font-medium text-white">{story?.recordedLabel || 'Date not provided'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Other versions</p>
                      <p className="mt-1 font-medium text-white">
                        {story ? `${story.relatedVersionCount} linked` : 'Not listed'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Research status</p>
                      <p className="mt-1 font-medium text-white">{story?.researchStatus || 'General release'}</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {activeTab === 'research' ? (
            researchLoadState === 'loading' ? (
              renderResearchSkeleton()
            ) : researchLoadState === 'error' ? (
              <div className="rounded-[24px] border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
                {researchError || 'Research references unavailable.'}
              </div>
            ) : researchRefs.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 text-sm text-white/72">
                <p>No research references added yet.</p>
                {adminResearchHref ? (
                  <Link
                    href={adminResearchHref}
                    className="mt-3 inline-flex items-center gap-2 font-semibold text-[#F5D37A] hover:text-[#EACE7B]"
                  >
                    Add references in the admin panel
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {researchRefs.map((reference) => (
                  <article
                    key={reference.id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/25"
                  >
                    <div className="grid gap-4 p-4 md:grid-cols-[120px,1fr]">
                      {reference.imageUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                          <img
                            src={reference.imageUrl}
                            alt={reference.title}
                            className="h-full min-h-[120px] w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className={reference.imageUrl ? '' : 'md:col-span-2'}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5D37A]">
                            {getSourceLabel(reference.source)}
                          </span>
                          {reference.relevantTo ? (
                            <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/55">
                              {reference.relevantTo}
                            </span>
                          ) : null}
                        </div>
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-start gap-2 text-left text-lg font-semibold text-white transition hover:text-[#F5D37A]"
                        >
                          <span>{reference.title}</span>
                          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" />
                        </a>
                        {reference.author || reference.year ? (
                          <p className="mt-2 text-sm text-white/65">
                            {[reference.author, reference.year].filter(Boolean).join(' • ')}
                          </p>
                        ) : null}
                        {reference.excerpt ? (
                          <p className="mt-3 text-sm leading-6 text-white/74">
                            {truncateChamberResearchExcerpt(reference.excerpt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}

          {activeTab === 'critique' ? (
            <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 text-sm text-white/72">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#F5D37A]">
                <Microscope className="h-3.5 w-3.5" />
                Critique
              </p>
              <p className="mt-3">Critique coming soon.</p>
            </div>
          ) : null}

          {activeTab === 'otherVersions' ? (
            <div className="rounded-[24px] border border-white/10 bg-black/25 p-6 text-sm text-white/72">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#F5D37A]">
                <LibraryBig className="h-3.5 w-3.5" />
                Other versions
              </p>
              <p className="mt-3">Other versions coming soon.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
