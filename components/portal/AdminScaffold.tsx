'use client'

import { useMemo, useState } from 'react'
import type { AdminTableRow } from '@/lib/types/portal'

interface AdminScaffoldProps {
  title: string
  labels: {
    requests: string
    sessions: string
    participants: string
    reports: string
  }
  rowsByTab: Record<string, AdminTableRow[]>
}

export default function AdminScaffold({ title, labels, rowsByTab }: AdminScaffoldProps) {
  const tabs = useMemo(
    () => [
      { key: 'requests', label: labels.requests },
      { key: 'sessions', label: labels.sessions },
      { key: 'participants', label: labels.participants },
      { key: 'reports', label: labels.reports },
    ],
    [labels],
  )

  const [active, setActive] = useState(tabs[0]?.key ?? 'requests')
  const activeRows = rowsByTab[active] ?? []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-900">{row.title}</td>
                <td className="px-4 py-3 text-slate-700">{row.owner}</td>
                <td className="px-4 py-3 text-slate-700">{row.status}</td>
                <td className="px-4 py-3 text-slate-700">{row.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
