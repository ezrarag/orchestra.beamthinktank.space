'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, MessageSquare } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'

interface ApiResponse {
  ok?: boolean
  message?: string
  error?: string
  details?: string
}

interface SlackNoteRecord {
  id: string
  title: string
  note: string
  contextPage?: string
  adminEmail?: string
  adminRole?: string
  createdAt?: string | null
  slackStatus?: 'pending' | 'sent' | 'failed' | 'unknown'
  slackError?: string
}

export default function AdminSlackNotesPage() {
  const { user, role, loading: roleLoading } = useUserRole()

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [contextPage, setContextPage] = useState('/admin/slack-notes')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [recentNotes, setRecentNotes] = useState<SlackNoteRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && note.trim().length >= 5 && !sending
  }, [title, note, sending])

  const hasAccess = role === 'beam_admin' || role === 'partner_admin'

  const loadRecentNotes = async () => {
    if (!user || !hasAccess) {
      return
    }

    setLoadingHistory(true)
    setHistoryError('')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/admin/slack-notes?limit=30', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load note history.')
      }

      setRecentNotes(Array.isArray(data.notes) ? data.notes : [])
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load note history.')
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (!roleLoading && hasAccess && user) {
      loadRecentNotes()
    }
  }, [roleLoading, hasAccess, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user || !canSubmit) {
      return
    }

    setSending(true)
    setResult(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/admin/slack-notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim(),
          contextPage: contextPage.trim() || undefined,
        }),
      })

      const data = (await response.json()) as ApiResponse

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to send Slack note.')
      }

      setResult({
        ok: true,
        message: data.message || 'Slack note sent successfully.',
      })
      setTitle('')
      setNote('')
      await loadRecentNotes()
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to send Slack note.',
      })
    } finally {
      setSending(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold text-orchestra-gold">Slack Notes</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          Your account does not currently have permission to send Slack notes. Use a `beam_admin` or
          `partner_admin` account.
        </div>
      </div>
    )
  }

  const formatDate = (value?: string | null) => {
    if (!value) return 'Unknown time'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-orchestra-gold">Slack Notes</h1>
        <p className="text-sm text-orchestra-cream/75">
          Send an internal note to the configured Slack channel.
        </p>
      </header>

      {result && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            result.ok
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          )}
          <p>{result.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-orchestra-gold/20 bg-orchestra-dark/50 p-6">
        <div className="space-y-2">
          <label htmlFor="slack-note-title" className="block text-sm font-medium text-orchestra-cream">
            Title
          </label>
          <input
            id="slack-note-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Front-page hero copy update"
            className="w-full rounded-lg border border-orchestra-gold/30 bg-black/20 px-3 py-2 text-sm text-orchestra-cream placeholder:text-orchestra-cream/45 focus:border-orchestra-gold focus:outline-none"
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slack-note-body" className="block text-sm font-medium text-orchestra-cream">
            Note
          </label>
          <textarea
            id="slack-note-body"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add details the team should see in Slack..."
            rows={7}
            className="w-full rounded-lg border border-orchestra-gold/30 bg-black/20 px-3 py-2 text-sm text-orchestra-cream placeholder:text-orchestra-cream/45 focus:border-orchestra-gold focus:outline-none"
            maxLength={3000}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slack-note-context-page" className="block text-sm font-medium text-orchestra-cream">
            Page Context (optional)
          </label>
          <input
            id="slack-note-context-page"
            value={contextPage}
            onChange={(event) => setContextPage(event.target.value)}
            placeholder="/admin/projects"
            className="w-full rounded-lg border border-orchestra-gold/30 bg-black/20 px-3 py-2 text-sm text-orchestra-cream placeholder:text-orchestra-cream/45 focus:border-orchestra-gold focus:outline-none"
            maxLength={240}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-orchestra-gold px-4 py-2 font-semibold text-black transition-colors hover:bg-orchestra-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {sending ? 'Sending...' : 'Send to Slack'}
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-orchestra-gold">Recent Notes</h2>
          <button
            type="button"
            onClick={loadRecentNotes}
            disabled={loadingHistory}
            className="rounded-lg border border-orchestra-gold/30 px-3 py-1.5 text-xs font-medium text-orchestra-gold hover:bg-orchestra-gold/10 disabled:opacity-50"
          >
            {loadingHistory ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {historyError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {historyError}
          </div>
        )}

        {loadingHistory && recentNotes.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-orchestra-gold/20 bg-orchestra-dark/50 p-8">
            <Loader2 className="h-6 w-6 animate-spin text-orchestra-gold" />
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="rounded-xl border border-orchestra-gold/20 bg-orchestra-dark/50 p-6 text-sm text-orchestra-cream/70">
            No notes have been logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotes.map((item) => (
              <article
                key={item.id}
                className="space-y-2 rounded-xl border border-orchestra-gold/20 bg-orchestra-dark/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-orchestra-cream">{item.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      item.slackStatus === 'sent'
                        ? 'bg-green-500/20 text-green-300'
                        : item.slackStatus === 'failed'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-orchestra-gold/20 text-orchestra-gold'
                    }`}
                  >
                    {item.slackStatus || 'unknown'}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-orchestra-cream/85">{item.note}</p>
                <div className="text-xs text-orchestra-cream/65">
                  <p>Sent by: {item.adminEmail || 'Unknown'} ({item.adminRole || 'admin'})</p>
                  <p>Time: {formatDate(item.createdAt)}</p>
                  {item.contextPage && <p>Context: {item.contextPage}</p>}
                  {item.slackError && <p className="text-red-300">Slack error: {item.slackError}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
