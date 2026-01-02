'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import { ArrowLeft, Calendar, Users, Tag } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Interview {
  id: string
  subject: string
  url: string
  transcript?: string
  tags?: string[]
  instrument?: string
  role?: string
  identityTags?: string[]
  createdAt?: any
  thumbnailUrl?: string
}

export default function InterviewPage() {
  const params = useParams()
  const id = params.id as string
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInterview = async () => {
      if (!db || !id) return

      try {
        const docRef = doc(db, 'interviews', id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          setInterview({
            id: docSnap.id,
            ...docSnap.data(),
          } as Interview)
        }
      } catch (error) {
        console.error('Error loading interview:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInterview()
  }, [id])

  const formatDate = (date?: any): string => {
    if (!date) return ''
    const d = date?.toDate?.() || date
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Interview Not Found</h1>
          <Link href="/studio/interviews" className="text-[#D4AF37] hover:text-[#B8941F]">
            ← Back to Interviews
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <Link href="/studio/interviews" className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] mb-6">
            <ArrowLeft className="h-5 w-5" />
            Back to Interviews
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {interview.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-white/70">
            {interview.instrument && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>{interview.instrument}</span>
              </div>
            )}
            {interview.role && (
              <div className="flex items-center gap-2">
                <span>{interview.role}</span>
              </div>
            )}
            {interview.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(interview.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <video
              src={interview.url}
              controls
              poster={interview.thumbnailUrl}
              className="w-full rounded-lg border border-white/10 bg-black max-h-[600px]"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Tags */}
      {(interview.tags || interview.identityTags) && (
        <section className="px-4 sm:px-6 lg:px-8 py-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {interview.tags?.map((tag, idx) => (
                <span
                  key={`tag-${idx}`}
                  className="px-3 py-1 bg-white/10 text-white/70 text-sm rounded-full border border-white/20 flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
              {interview.identityTags?.map((tag, idx) => (
                <span
                  key={`identity-${idx}`}
                  className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-sm rounded-full border border-[#D4AF37]/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Transcript */}
      {interview.transcript && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Transcript</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <div className="prose prose-invert max-w-none">
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                  {interview.transcript}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

