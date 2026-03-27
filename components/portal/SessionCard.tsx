import type { CommitmentSummary, OpenCallSummary, SessionSummary } from '@/lib/types/portal'

type SessionLike = SessionSummary | CommitmentSummary

export function SessionCard({ item }: { item: SessionLike }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <h3 className="text-base font-semibold text-white">{item.title}</h3>
      {'date' in item ? (
        <p className="mt-1 text-sm text-white/62">{item.date} · {item.location}</p>
      ) : (
        <p className="mt-1 text-sm text-white/62">{item.time} · {item.location}</p>
      )}
    </article>
  )
}

export function OpenCallCard({ call }: { call: OpenCallSummary }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{call.title}</h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
            call.paid
              ? 'border-emerald-300/15 bg-emerald-400/12 text-emerald-200'
              : 'border-white/10 bg-white/[0.06] text-white/72'
          }`}
        >
          {call.paid ? 'Paid' : 'Volunteer'}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/62">{call.details}</p>
    </article>
  )
}
