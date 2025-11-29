'use client'

import { useState } from 'react'
import Footer from '@/components/Footer'
import { Play, ArrowRight, ExternalLink, Calendar } from 'lucide-react'
import Link from 'next/link'

// TODO: load dynamically from Firestore later
const rehearsalVideos = [
  {
    id: 'bonds-2025-11-10',
    project: 'Black Diaspora Symphony Orchestra',
    piece: 'Bonds – Rehearsal Excerpt',
    date: 'Nov 10, 2025',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=68f26fd3-60ed-465a-841b-71073d683034'
  }
]

const featuredProjects = [
  {
    id: 'black-diaspora-symphony',
    title: 'Black Diaspora Symphony Orchestra',
    description: 'Annual memorial concert featuring Margaret Bonds\' Montgomery Variations, Maurice Ravel\'s Le Tombeau de Couperin, and works by Edvard Grieg. Rehearsals in Milwaukee leading up to the December 14th performance.',
    tag: 'Memorial Concert 2025',
    projectRoute: '/training/contract-projects/black-diaspora-symphony'
  },
  {
    id: 'afro-caribbean-jazz',
    title: 'UWM Afro-Caribbean Jazz Orchestra',
    description: 'Celebrating Afro-Caribbean musical traditions through jazz orchestration and contemporary arrangements.',
    tag: 'Jazz Series',
    projectRoute: '/training'
  }
]

export default function StudioPage() {
  const [videoError, setVideoError] = useState<Record<string, boolean>>({})

  const handleVideoError = (videoId: string) => {
    console.error('Video failed to load', videoId)
    setVideoError(prev => ({ ...prev, [videoId]: true }))
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Watch & Explore
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-6">
              Rehearsals, interviews, and project archives from BEAM Orchestra and partner ensembles.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-sm font-medium rounded-full border border-[#D4AF37]/30">
                Black Diaspora Symphony Orchestra
              </span>
              <span className="px-4 py-2 bg-white/10 text-white/70 text-sm font-medium rounded-full border border-white/20">
                UWM Afro-Caribbean Jazz Orchestra
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Project Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {featuredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white/5 border border-white/10 rounded-xl p-8 hover:border-[#D4AF37]/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">{project.title}</h3>
                  <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium rounded-full">
                    {project.tag}
                  </span>
                </div>
                <p className="text-white/70 mb-6 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#rehearsal-gallery"
                    className="inline-flex items-center justify-center px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    View Rehearsals
                  </a>
                  <Link
                    href={project.projectRoute}
                    className="inline-flex items-center justify-center px-6 py-3 bg-transparent border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold rounded-lg transition-all duration-300"
                  >
                    Project Details
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rehearsal Video Gallery */}
      <section id="rehearsal-gallery" className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Rehearsal Archives</h2>
          {rehearsalVideos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/60 text-lg">
                No rehearsal videos available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {rehearsalVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all duration-300"
                >
                  <div className="mb-4">
                    <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wide mb-2">
                      {video.project}
                    </p>
                    <h3 className="text-xl font-bold text-white mb-2">{video.piece}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Calendar className="h-4 w-4" />
                      <span>{video.date}</span>
                    </div>
                  </div>
                  {videoError[video.id] ? (
                    <div className="w-full aspect-video bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-white/60 mb-2">Video failed to load</p>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D4AF37] hover:text-[#B8941F] text-sm inline-flex items-center gap-2"
                        >
                          Open video link
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <video
                      src={video.url}
                      controls
                      className="w-full rounded-lg border border-white/10 bg-black max-h-[480px]"
                      onError={() => handleVideoError(video.id)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Support & Subscribe Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Support & Subscribe</h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Subscribers get full access to rehearsal archives, interviews, and behind-the-scenes materials across the BEAM network. Your subscription will connect through the BEAM Neighbor portal.
          </p>
          {/* TODO: Replace this with real subscription flow (Stripe + Neighbor SSO) */}
          {/* TODO: After subscription, redirect user to neighbor.beamthinktank.space with SSO token */}
          <Link
            href="/subscriber"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50"
          >
            Sign In / Subscribe
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

