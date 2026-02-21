import type { CommitmentSummary, OpenCallSummary, SessionSummary } from '@/lib/types/portal'

type SessionLike = SessionSummary | CommitmentSummary

export function SessionCard({ item }: { item: SessionLike }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
      {'date' in item ? (
        <p className="mt-1 text-sm text-slate-600">{item.date} · {item.location}</p>
      ) : (
        <p className="mt-1 text-sm text-slate-600">{item.time} · {item.location}</p>
      )}
    </article>
  )
}

export function OpenCallCard({ call }: { call: OpenCallSummary }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{call.title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${call.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
          {call.paid ? 'Paid' : 'Volunteer'}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{call.details}</p>
    </article>
  )
}
