'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { 
  Save, Eye, CheckCircle2, ChevronLeft, Globe, Edit3, 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Quote, Undo, Redo, Users, PlusCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

export default function DocumentBuilder({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<any>(null)
  
  // Settings
  const [title, setTitle] = useState('')
  const [version, setVersion] = useState('v1.0')
  const [status, setStatus] = useState('draft')
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Assignments
  const [teachers, setTeachers] = useState<any[]>([])
  const [existingAssignments, setExistingAssignments] = useState<any[]>([])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px]',
      },
    },
    onUpdate: () => { /* can trigger auto-save here */ },
  })

  useEffect(() => {
    loadDocument()
    loadTeachers()
  }, [])

  const loadDocument = async () => {
    const { data } = await supabase.from('documents').select('*').eq('id', id).single()
    if (data) {
      setDoc(data)
      setTitle(data.title)
      setVersion(data.version)
      setStatus(data.status)
      if (editor && editor.getHTML() !== data.content) {
        editor.commands.setContent(data.content)
      }
      
      const { data: aData } = await supabase.from('document_assignments').select('teacher_id, status').eq('document_id', id)
      setExistingAssignments(aData || [])
    }
    setLoading(false)
  }

  const loadTeachers = async () => {
    const { data } = await supabase.from('teachers').select('id, full_name, email').order('full_name')
    setTeachers(data || [])
  }

  const handleSave = async (willPublish = false) => {
    if (!editor) return
    setSaving(true)
    const content = editor.getHTML()
    const newStatus = willPublish ? 'published' : doc.status

    let saveVersion = version
    if (willPublish && doc.status === 'published') {
      // If updating an already published document, ideally we bump version. 
      // Simplified: bump minor version.
      const match = version.match(/v(\d+)\.(\d+)/)
      if (match) {
         saveVersion = `v${match[1]}.${parseInt(match[2]) + 1}`
      }
    }

    const { error } = await supabase.from('documents').update({
      title,
      content,
      status: newStatus,
      version: saveVersion
    }).eq('id', id)

    if (error) {
      toast.error('Failed to save document')
    } else {
      toast.success(willPublish ? 'Published successfully!' : 'Saved as draft')
      setDoc({ ...doc, title, content, status: newStatus, version: saveVersion })
      setStatus(newStatus)
      setVersion(saveVersion)
    }
    setSaving(false)
  }

  const handleAssignToAll = async () => {
    if (!confirm('Assign this document to all active teachers?')) return
    const unassigned = teachers.filter(t => !existingAssignments.find(a => a.teacher_id === t.id))
    
    if (unassigned.length === 0) {
      toast.error('All teachers are already assigned.')
      return
    }

    const payload = unassigned.map(t => ({
      document_id: id,
      teacher_id: t.id,
      status: 'pending'
    }))

    const { error } = await supabase.from('document_assignments').insert(payload)
    if (error) {
      toast.error('Failed to assign teachers')
      console.error(error)
    } else {
      toast.success(`Assigned to ${unassigned.length} teachers`)
      loadDocument()
    }
  }

  if (loading || !editor) return (
    <div className="p-6 h-screen flex flex-col space-y-4">
       <div className="h-12 bg-[var(--input)] animate-pulse rounded-xl w-1/3" />
       <div className="flex-1 bg-[var(--input)] animate-pulse rounded-3xl" />
    </div>
  )

  const isPublished = status === 'published'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sticky top-0 bg-[var(--background)] z-10 pb-4 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/terms')} className="px-2">
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-black">{title || 'Untitled Document'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold bg-[var(--input)] px-2 py-0.5 rounded-lg">{version}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-widest ${isPublished ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} className="mr-2" /> Preview
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} isLoading={saving}>
            <Save size={16} className="mr-2" /> Save Draft
          </Button>
          {!isPublished && (
            <Button onClick={() => handleSave(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-emerald-500/20">
              <Globe size={16} className="mr-2" /> Publish Live
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Editor Main Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-2 border-[var(--card-border)] rounded-3xl bg-[var(--card)] shadow-sm">
          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-3 border-b border-[var(--card-border)] bg-[var(--input)]/50">
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 ${editor.isActive('bold') ? 'bg-[var(--card)] border' : ''}`}><Bold size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 ${editor.isActive('italic') ? 'bg-[var(--card)] border' : ''}`}><Italic size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-2 ${editor.isActive('underline') ? 'bg-[var(--card)] border' : ''}`}><UnderlineIcon size={16} /></Button>
            <div className="w-px h-6 bg-[var(--card-border)] mx-1" />
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 font-black ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--card)] border' : ''}`}>H1</Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--card)] border' : ''}`}>H2</Button>
            <div className="w-px h-6 bg-[var(--card-border)] mx-1" />
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 ${editor.isActive('bulletList') ? 'bg-[var(--card)] border' : ''}`}><List size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 ${editor.isActive('orderedList') ? 'bg-[var(--card)] border' : ''}`}><ListOrdered size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 ${editor.isActive('blockquote') ? 'bg-[var(--card)] border' : ''}`}><Quote size={16} /></Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} className="px-2" disabled={!editor.can().undo()}><Undo size={16} /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} className="px-2" disabled={!editor.can().redo()}><Redo size={16} /></Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative layout-scroll">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Sidebar: Settings & Assignments */}
        <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2 font-black">
              <Edit3 size={18} className="text-primary" /> Document Settings
            </div>
            <Input 
              label="Document Title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Teacher Terms 2026"
            />
            {isPublished && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-xs text-orange-600 font-semibold leading-relaxed">
                  This document is published. Saving changes will bump the version to v{version.match(/v\d+\.(\d+)/) ? parseInt(version.match(/v\d+\.(\d+)/)![1]) + 1 : 1} and older signatures will point to the previous version.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5 flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 font-black">
                 <Users size={18} className="text-primary" /> Assignments
               </div>
               <Badge count={existingAssignments.length} />
             </div>

             {!isPublished ? (
               <div className="py-12 text-center opacity-50">
                  <Globe size={32} className="mx-auto mb-2" />
                  <p className="text-xs px-4">You must publish the document before you can assign it to teachers.</p>
               </div>
             ) : (
               <>
                 <Button onClick={handleAssignToAll} className="w-full mb-4" variant="secondary">
                   <PlusCircle size={16} className="mr-2" /> Assign to All Active Teachers
                 </Button>

                 <div className="flex-1 overflow-y-auto pr-2 space-y-2 layout-scroll">
                   {teachers.map(t => {
                     const assignment = existingAssignments.find(a => a.teacher_id === t.id)
                     return (
                       <div key={t.id} className="p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-between">
                         <div className="min-w-0 pr-2">
                           <div className="font-bold text-sm truncate">{t.full_name}</div>
                           <div className="text-[10px] truncate text-[var(--text-muted)]">{t.email}</div>
                         </div>
                         {assignment ? (
                           <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${assignment.status === 'signed' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
                             {assignment.status}
                           </span>
                         ) : (
                           <Button size="sm" variant="ghost" onClick={async () => {
                             const { error } = await supabase.from('document_assignments').insert({ document_id: id, teacher_id: t.id, status: 'pending' })
                             if (!error) loadDocument()
                           }}>Assign</Button>
                         )}
                       </div>
                     )
                   })}
                 </div>
               </>
             )}
          </Card>
        </div>
      </div>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title={`Preview: ${title}`} size="xl">
        <div className="p-8 prose prose-slate max-w-none bg-white text-black min-h-[500px] border">
          <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
        </div>
      </Modal>
    </div>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span className="bg-primary/20 text-primary text-xs font-black px-2 py-0.5 rounded-full">
      {count}
    </span>
  )
}
