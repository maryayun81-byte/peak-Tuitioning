'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// Table completion (§55): rows/columns from question config, or a
// simple 2-column fallback. Every cell is evidence.
export default function TableBuilder({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const { columns, rowLabels, rows } = useMemo(() => {
    const cfg = (question.config as any) || {}
    const cols: string[] = Array.isArray(cfg.columns) && cfg.columns.length > 0
      ? cfg.columns
      : ['Item', 'Answer']
    const labels: string[] = Array.isArray(cfg.rows) && cfg.rows.length > 0
      ? cfg.rows
      : Array.from({ length: Number(cfg.row_count) > 0 ? Number(cfg.row_count) : 3 }, (_, i) => `Row ${i + 1}`)
    return { columns: cols, rowLabels: labels, rows: labels.length }
  }, [question.config])

  const [cells, setCells] = useState<string[][]>(() => {
    const saved = (initialWorking as any)?.cells
    if (Array.isArray(saved) && saved.length === rows) return saved
    return Array.from({ length: rows }, () => Array(columns.length).fill(''))
  })

  const setCell = (r: number, c: number, v: string) => {
    if (readOnly) return
    const next = cells.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? v : cell)))
    setCells(next)
    onWorkingChange?.({ cells: next }, next)
  }

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--card-border)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--input)' }}>
            <th className="w-10 px-2 py-2" />
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((label, r) => (
            <tr key={r} style={{ borderTop: '1px solid var(--card-border)' }}>
              <td className="px-2 py-1.5 text-[11px] font-bold text-center" style={{ color: 'var(--text-muted)' }}>
                {label}
              </td>
              {columns.map((_, c) => (
                <td key={c} className="px-1.5 py-1.5">
                  <input
                    value={cells[r]?.[c] ?? ''}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                    aria-label={`${label}, ${columns[c]}`}
                    className="w-full rounded-lg border px-2.5 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
