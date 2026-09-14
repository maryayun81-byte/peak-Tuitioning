'use client'

import { useState, useEffect } from 'react'
import {
  ListChecks, Plus, Trash2, Link2, Unlink,
  FileText, Video, Globe, HelpCircle, Search, Paperclip
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FileUploadZone } from '@/components/worksheet/FileUploadZone'
import {
  getLearningObjectives, createLearningObjective, deleteLearningObjective,
  getLearningResources, createLearningResource, deleteLearningResource,
  getSessionAssignment, getLinkableAssignments,
  attachAssignmentToSession, detachAssignmentFromSession,
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { LearningObjective, LearningResource } from '@/types/homeschooling'

interface Props {
  sessionId: string
  onChanged?: () => void
}

const RESOURCE_TYPES = [
  { value: 'document', label: 'Study Notes', Icon: FileText },
  { value: 'video', label: 'Video Lesson', Icon: Video },
  { value: 'link', label: 'Web Link', Icon: Globe },
  { value: 'question_set', label: 'Practice Questions', Icon: HelpCircle },
  { value: 'quiz', label: 'Quiz', Icon: HelpCircle },
  { value: 'file', label: 'File', Icon: Paperclip },
  { value: 'image', label: 'Image', Icon: Paperclip },
]

export default function SessionContentBuilder({ sessionId, onChanged }: Props) {
  const [objectives, setObjectives] = useState<LearningObjective[]>([])
  const [resources, setResources] = useState<LearningResource[]>([])
  const [assignment, setAssignment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [objTitle, setObjTitle] = useState('')
  const [objDesc, setObjDesc] = useState('')
  const [objSaving, setObjSaving] = useState(false)

  const [resTitle, setResTitle] = useState('')
  const [resType, setResType] = useState('document')
  const [resUrl, setResUrl] = useState('')
  const [resRequired, setResRequired] = useState(false)
  const [resMinutes, setResMinutes] = useState('')
  const [resSaving, setResSaving] = useState(false)

  const [linkSearch, setLinkSearch] = useState('')
  const [linkResults, setLinkResults] = useState<any[]>([])
  const [linkLoading, setLinkLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [showLinker, setShowLinker] = useState(false)

  useEffect(() => { load() }, [sessionId])

  const load = async () => {
    setLoading(true)
    try {
      const [objRes, resRes, assignRes] = await Promise.all([
        getLearningObjectives(sessionId),
        getLearningResources(sessionId),
        getSessionAssignment(sessionId),
      ])
      if (objRes.success) setObjectives(objRes.data || [])
      if (resRes.success) setResources(resRes.data || [])
      if (assignRes.success) setAssignment(assignRes.data)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    load()
    onChanged?.()
  }

  const handleAddObjective = async () => {
    if (!objTitle.trim()) {
      toast.error('Objective title is required')
      return
    }
    setObjSaving(true)
    try {
      const res = await createLearningObjective(sessionId, objTitle.trim(), objDesc.trim() || undefined)
      if (!res.success) throw new Error(res.error)
      toast.success('Objective added')
      setObjTitle('')
      setObjDesc('')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add objective')
    } finally {
      setObjSaving(false)
    }
  }

  const handleDeleteObjective = async (id: string) => {
    try {
      const res = await deleteLearningObjective(id)
      if (!res.success) throw new Error(res.error)
      toast.success('Objective removed')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove objective')
    }
  }

  const handleAddResource = async () => {
    if (!resTitle.trim()) {
      toast.error('Resource title is required')
      return
    }
    if (!resUrl.trim()) {
      toast.error('Attach a file or paste a link')
      return
    }
    setResSaving(true)
    try {
      const isLink = resType === 'link' || resType === 'video'
      const minutes = parseInt(resMinutes, 10)
      const res = await createLearningResource(sessionId, {
        title: resTitle.trim(),
        type: resType,
        url: isLink ? resUrl.trim() : undefined,
        file_path: !isLink ? resUrl.trim() : undefined,
        is_required: resRequired,
        estimated_minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      })
      if (!res.success) throw new Error(res.error)
      toast.success('Resource attached')
      setResTitle('')
      setResUrl('')
      setResRequired(false)
      setResMinutes('')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach resource')
    } finally {
      setResSaving(false)
    }
  }

  const handleDeleteResource = async (id: string) => {
    try {
      const res = await deleteLearningResource(id)
      if (!res.success) throw new Error(res.error)
      toast.success('Resource removed')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove resource')
    }
  }

  const handleSearchAssignments = async () => {
    setLinkLoading(true)
    try {
      const res = await getLinkableAssignments(linkSearch || undefined)
      if (!res.success) throw new Error(res.error)
      setLinkResults(res.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to search assignments')
    } finally {
      setLinkLoading(false)
    }
  }

  const handleAttach = async (assignmentId: string) => {
    setLinking(true)
    try {
      const res = await attachAssignmentToSession(sessionId, assignmentId)
      if (!res.success) throw new Error(res.error)
      toast.success('Assignment linked to session')
      setShowLinker(false)
      setLinkResults([])
      setLinkSearch('')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to link assignment')
    } finally {
      setLinking(false)
    }
  }

  const handleDetach = async () => {
    try {
      const res = await detachAssignmentFromSession(sessionId)
      if (!res.success) throw new Error(res.error)
      toast.success('Assignment unlinked')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink')
    }
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl animate-pulse" style={{ background: 'var(--input)' }}>
        <div className="h-3 w-32 rounded bg-[var(--card-border)] mb-2" />
        <div className="h-8 w-full rounded-lg bg-[var(--card-border)]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ListChecks size={15} style={{ color: 'var(--primary)' }} />
          <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            Learning Objectives ({objectives.length})
          </h4>
        </div>

        {objectives.length > 0 && (
          <div className="space-y-2 mb-3">
            {objectives.map((o, i) => (
              <div key={o.id} className="flex items-start gap-3 p-2.5 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                <span className="text-[10px] font-black w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--primary)', color: '#fff' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{o.title}</p>
                  {o.description && <p className="text-[11px] opacity-60 mt-0.5">{o.description}</p>}
                </div>
                <button onClick={() => handleDeleteObjective(o.id)} className="p-1.5 rounded-lg hover:opacity-70 shrink-0" style={{ color: '#EF4444' }} aria-label="Remove objective">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <Input placeholder="Objective title *" value={objTitle} onChange={e => setObjTitle(e.target.value)} />
          <Input placeholder="Description (optional)" value={objDesc} onChange={e => setObjDesc(e.target.value)} />
          <Button size="sm" onClick={handleAddObjective} isLoading={objSaving}><Plus size={13} /> Add</Button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={15} style={{ color: 'var(--primary)' }} />
          <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            Resources ({resources.length})
          </h4>
        </div>

        {resources.length > 0 && (
          <div className="space-y-2 mb-3">
            {resources.map(r => {
              const typeInfo = RESOURCE_TYPES.find(t => t.value === r.type)
              const TypeIcon = typeInfo?.Icon || FileText
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <TypeIcon size={14} style={{ color: 'var(--primary)' }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{r.title}</p>
                    <p className="text-[10px] opacity-50">{typeInfo?.label || r.type}{r.is_required ? ' · Required' : ''}{(r as any).estimated_minutes ? ` · ~${(r as any).estimated_minutes} min` : ''}</p>
                  </div>
                  {r.is_required && <Badge variant="warning" className="text-[9px] shrink-0">Required</Badge>}
                  <button onClick={() => handleDeleteResource(r.id)} className="p-1.5 rounded-lg hover:opacity-70 shrink-0" style={{ color: '#EF4444' }} aria-label="Remove resource">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <Card className="p-3 space-y-3" style={{ background: 'var(--input)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="Resource title *" value={resTitle} onChange={e => setResTitle(e.target.value)} />
            <Select value={resType} onChange={e => { setResType(e.target.value); setResUrl('') }}>
              {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          {(resType === 'link' || resType === 'video') ? (
            <Input placeholder="Paste URL *" value={resUrl} onChange={e => setResUrl(e.target.value)} />
          ) : (
            <FileUploadZone
              value={resUrl || null}
              onChange={url => setResUrl(url || '')}
              bucket="assignment-uploads"
              acceptDocs
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" checked={resRequired} onChange={e => setResRequired(e.target.checked)} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Required</span>
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={resMinutes}
              onChange={e => setResMinutes(e.target.value)}
              placeholder="~ min"
              aria-label="Estimated minutes"
              title="Estimated time for the student (minutes, optional)"
              className="w-20 rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
            />
            <Button size="sm" onClick={handleAddResource} isLoading={resSaving}><Plus size={13} /> Attach</Button>
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 size={15} style={{ color: 'var(--primary)' }} />
            <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>
              Linked Assignment
            </h4>
          </div>
          {!assignment && (
            <Button size="sm" variant="secondary" onClick={() => { setShowLinker(v => !v); if (!showLinker && linkResults.length === 0) handleSearchAssignments() }}>
              <Link2 size={13} /> Link Assignment
            </Button>
          )}
        </div>

        {assignment ? (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(79,140,255,0.07)', border: '1px solid rgba(79,140,255,0.3)' }}>
            <FileText size={15} style={{ color: 'var(--primary)' }} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{assignment.title}</p>
              <p className="text-[10px] opacity-50">
                {assignment.subject?.name || 'Assignment'}
                {assignment.due_date ? ` · Due ${new Date(assignment.due_date).toLocaleDateString()}` : ''}
                {assignment.max_marks ? ` · ${assignment.max_marks} marks` : ''}
              </p>
            </div>
            <Badge variant={assignment.status === 'published' ? 'success' : 'muted'} className="text-[9px] uppercase shrink-0">{assignment.status}</Badge>
            <button onClick={handleDetach} className="p-1.5 rounded-lg hover:opacity-70 shrink-0" style={{ color: '#EF4444' }} aria-label="Unlink assignment">
              <Unlink size={13} />
            </button>
          </div>
        ) : (
          <p className="text-[11px] font-medium opacity-50 mb-2">No assignment linked. Student submissions flow through the linked assignment.</p>
        )}

        {showLinker && !assignment && (
          <Card className="p-3 space-y-2 mt-2" style={{ background: 'var(--input)' }}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
                <Input placeholder="Search your assignments..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="pl-8" />
              </div>
              <Button size="sm" variant="secondary" onClick={handleSearchAssignments} isLoading={linkLoading}>Search</Button>
            </div>
            {linkResults.length > 0 ? (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {linkResults.map(a => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{a.title}</p>
                      <p className="text-[10px] opacity-50">{a.subject?.name || ''} · {a.status}{a.session_id ? ' · already linked' : ''}</p>
                    </div>
                    <Button size="sm" variant="ghost" disabled={linking || !!a.session_id} onClick={() => handleAttach(a.id)}>
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            ) : !linkLoading && (
              <p className="text-[11px] opacity-50 text-center py-2">No assignments found. Create one from Assignments first.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
