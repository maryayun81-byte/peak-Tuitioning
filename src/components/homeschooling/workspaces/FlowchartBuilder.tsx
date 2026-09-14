'use client'

import { useState } from 'react'
import type { WorkspaceProps } from './registry'

// §61 — Flowchart builder. Sequential node list with structural validation:
// must start with Start, end with End; Decision needs a branch label.
// Connections are implicit (top→bottom); invalid transitions are flagged, not hidden.
const NODE_TYPES = ['Start', 'Input', 'Process', 'Decision', 'Output', 'End'] as const
type NodeType = (typeof NODE_TYPES)[number]
interface FNode { id: string; type: NodeType; label: string; branch?: string }

let seq = 0
const nid = () => `n${Date.now()}_${seq++}`

export default function FlowchartBuilder({ initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const [nodes, setNodes] = useState<FNode[]>(() => Array.isArray((initialWorking as any)?.nodes) ? (initialWorking as any).nodes : [])
  const [draftType, setDraftType] = useState<NodeType>('Process')
  const [draftLabel, setDraftLabel] = useState('')
  const [draftBranch, setDraftBranch] = useState('')

  const emit = (next: FNode[]) => {
    const answer = next.map((n) => `${n.type}: ${n.label}`).join(' → ')
    onWorkingChange?.({ nodes: next }, answer)
  }
  const add = () => {
    if (readOnly || !draftLabel.trim()) return
    const next = [...nodes, { id: nid(), type: draftType, label: draftLabel.trim(), branch: draftType === 'Decision' ? draftBranch.trim() || undefined : undefined }]
    setNodes(next); setDraftLabel(''); setDraftBranch(''); emit(next)
  }
  const move = (i: number, dir: -1 | 1) => {
    if (readOnly) return
    const j = i + dir
    if (j < 0 || j >= nodes.length) return
    const next = [...nodes]
    ;[next[i], next[j]] = [next[j], next[i]]
    setNodes(next); emit(next)
  }
  const remove = (i: number) => {
    if (readOnly) return
    const next = nodes.filter((_, k) => k !== i)
    setNodes(next); emit(next)
  }

  // Validation (§61): structure + connections + logical flow.
  const issues: string[] = []
  if (nodes.length === 0) issues.push('Add nodes to build your flowchart.')
  else {
    if (nodes[0].type !== 'Start') issues.push('Flowchart must start with a Start node.')
    if (nodes[nodes.length - 1].type !== 'End') issues.push('Flowchart must end with an End node.')
    nodes.forEach((n, i) => {
      if (n.type === 'Decision' && !n.branch) issues.push(`Decision at step ${i + 1} needs a branch label (e.g. Yes / No).`)
      if ((n.type === 'Start' || n.type === 'End') && nodes.filter((m) => m.type === n.type).length > 1)
        if (i === nodes.findIndex((m) => m.type === n.type)) issues.push(`Only one ${n.type} node is allowed.`)
    })
  }
  const valid = issues.length === 0 && nodes.length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={draftType} onChange={(e) => setDraftType(e.target.value as NodeType)} disabled={readOnly}
          aria-label="Node type" className="rounded-xl border px-3 py-2.5 text-sm font-bold min-h-[44px]"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
          {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} disabled={readOnly}
          placeholder={draftType === 'Decision' ? 'e.g. score ≥ 50?' : 'e.g. Read marks'}
          aria-label="Node label"
          className="flex-1 min-w-[160px] rounded-xl border px-3 py-2.5 text-sm font-semibold min-h-[44px]"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }} />
        {draftType === 'Decision' && (
          <input value={draftBranch} onChange={(e) => setDraftBranch(e.target.value)} disabled={readOnly}
            placeholder="Branch: Yes / No" aria-label="Branch label"
            className="w-36 rounded-xl border px-3 py-2.5 text-sm font-semibold min-h-[44px]"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }} />
        )}
        <button type="button" onClick={add} disabled={readOnly || !draftLabel.trim()}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 min-h-[44px]"
          style={{ background: 'var(--primary)' }}>Add</button>
      </div>

      {nodes.length > 0 && (
        <ol className="space-y-1">
          {nodes.map((n, i) => (
            <li key={n.id} className="flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
              <span className="text-[10px] font-black rounded-lg px-2 py-1 uppercase" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>{n.type}</span>
              <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {n.label}{n.branch ? <span style={{ color: 'var(--text-muted)' }}> ({n.branch})</span> : null}
              </span>
              {!readOnly && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="px-2 py-1 text-lg">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="px-2 py-1 text-lg">↓</button>
                  <button type="button" onClick={() => remove(i)} aria-label="Remove node" className="px-2 py-1 text-lg">×</button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-xl p-3 text-xs font-semibold" style={{ background: valid ? 'rgba(16,185,129,0.12)' : 'var(--input)', color: valid ? '#10B981' : 'var(--text-muted)' }}>
        {valid ? '✓ Valid flow: Start → steps → End.' : issues.map((m, i) => <p key={i}>• {m}</p>)}
      </div>
    </div>
  )
}
