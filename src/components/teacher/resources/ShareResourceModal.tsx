'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, Users, User, Link2, MessageSquare, Share2, CheckCircle2, 
  Copy, Clock, Lock, Send, ChevronRight, Search, Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface ShareResourceModalProps {
  isOpen: boolean
  onClose: () => void
  resourceTitle: string
  resourceSections?: string[]
}

interface ClassData {
  id: string
  class_id: string
  name: string
  subject: string
  subject_id: string
  studentCount: number
  students: { id: string, name: string, avatar: string, user_id: string }[]
}

type ShareMode = 'class' | 'student' | 'link' | 'whatsapp'

export function ShareResourceModal({ isOpen, onClose, resourceTitle, resourceSections }: ShareResourceModalProps) {
  const [mode, setMode] = useState<ShareMode>('class')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [targetMastery, setTargetMastery] = useState('80')
  const [search, setSearch] = useState('')
  
  const [isSent, setIsSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const generatedLink = `https://peakcampus.co.ke/r/${resourceTitle.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`

  // Supabase State
  const [teacherClasses, setTeacherClasses] = useState<ClassData[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [teacherId, setTeacherId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    
    async function fetchData() {
      setLoadingData(true)
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).single()
        if (!teacher) return
        setTeacherId(teacher.id)
        
        const { data: mappings } = await supabase.from('teacher_teaching_map')
          .select(`
            class_id,
            subject_id,
            classes(id, name),
            subjects(id, name)
          `)
          .eq('teacher_id', teacher.id)
          
        if (!mappings || mappings.length === 0) return

        console.log("Supabase Mappings:", mappings)

        // Deduplicate classes so a class only appears once
        const uniqueMappings = []
        const seenClassIds = new Set()
        for (const m of mappings) {
          // Force string cast just in case class_id is returned as an object by PostgREST
          const cid = typeof m.class_id === 'object' ? (m.class_id as any).id || m.class_id : m.class_id
          if (!seenClassIds.has(cid)) {
            seenClassIds.add(cid)
            uniqueMappings.push({...m, class_id: cid})
          }
        }

        const classIds = uniqueMappings.map(m => m.class_id)
        
        const { data: students, error: studentError } = await supabase.from('students')
          .select(`
            id,
            user_id,
            class_id,
            full_name
          `)
          .in('class_id', classIds)
          
        console.log("Supabase Students:", students, "Error:", studentError)
          
        const formattedClasses = uniqueMappings.map((m, index) => {
          // @ts-ignore
          const className = Array.isArray(m.classes) ? m.classes[0]?.name : m.classes?.name || 'Unknown Class'
          // @ts-ignore
          const subjectName = Array.isArray(m.subjects) ? m.subjects[0]?.name : m.subjects?.name || 'Unknown Subject'

          const classStudents = (students || []).filter(s => s.class_id === m.class_id).map(s => {
            const fullName = s.full_name || 'Student'
            return {
              id: s.id,
              name: fullName,
              avatar: fullName.substring(0, 2).toUpperCase(),
              user_id: s.user_id
            }
          })
          
          return {
            id: `${m.class_id}-${index}`, // Force unique key for React
            class_id: m.class_id,
            name: className,
            subject: subjectName,
            subject_id: m.subject_id,
            studentCount: classStudents.length,
            students: classStudents
          }
        })
        
        setTeacherClasses(formattedClasses)
      } catch (e) {
        console.error("Error fetching teacher data:", e)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchData()
  }, [isOpen])

  const toggleClass = (id: string) => setSelectedClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const toggleStudent = (id: string) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const handleSend = async () => {
    if (!teacherId) return
    setIsSending(true)
    
    try {
      const supabase = getSupabaseBrowserClient()
      const contentJson = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: `Resource Assigned: ${resourceTitle}`, marks: [{type: "bold"}] }
            ]
          },
          ...(resourceSections ? [{
            type: "paragraph",
            content: [
              { type: "text", text: `Includes: ${resourceSections.join(', ')}`}
            ]
          }] : [])
        ]
      }

      if (mode === 'class' || mode === 'whatsapp') {
         for (const classId of selectedClasses) {
           const cls = teacherClasses.find(c => c.id === classId)
           if (!cls) continue
           
           const tempId = crypto.randomUUID()
           const { data: resData, error: resError } = await supabase.from('resources').insert({
             teacher_id: teacherId,
             class_id: cls.class_id,
             subject_id: cls.subject_id,
             title: resourceTitle,
             description: resourceSections ? `Includes: ${resourceSections.join(', ')}` : undefined,
             type: 'link',
             audience: 'class',
             url: 'pending'
           }).select('id').single()

           if (!resError && resData) {
             // Now update URL with the actual resource ID for self-referencing
             await supabase.from('resources').update({ url: `/student/resources/viewer?id=${resData.id}` }).eq('id', resData.id)

              if (cls.students.length > 0) {
                const notifications = cls.students.map(s => ({
                  user_id: s.user_id,
                  title: '📚 New Resource Shared',
                  body: `Your teacher shared a new resource: ${resourceTitle}`,
                  type: 'resource',
                  data: { resource_id: resData.id }
                }))
                await supabase.from('notifications').insert(notifications)
                const { sendPushNotification } = await import('@/app/actions/push')
                await sendPushNotification(cls.students.map(s => s.user_id).filter(Boolean) as string[], {
                  title: '📚 New Resource Shared',
                  body: `Your teacher shared a new resource: ${resourceTitle}`,
                  href: `/student/resources/viewer?id=${resData.id}`,
                  tag: 'resource-shared',
                })
              }
           } else {
             console.error('Error creating resource:', resError)
           }
         }
         
         if (mode === 'whatsapp') {
           const text = `Peak Performance Tutoring 📚\n\nYou have been assigned:\n*${resourceTitle}*\n\nOpen Resource: ${generatedLink}\n\nBest of luck! 🎯`
           window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
         }
      } else if (mode === 'student') {
         const studentsByClass = selectedStudents.reduce((acc, studentId) => {
           const cls = teacherClasses.find(c => c.students.some(s => s.id === studentId))
           if (cls) {
             if (!acc[cls.id]) acc[cls.id] = { actual_class_id: cls.class_id, subject_id: cls.subject_id, students: [] }
             acc[cls.id].students.push(studentId)
           }
           return acc
         }, {} as Record<string, {actual_class_id: string, subject_id: string, students: string[]}>)
         
         for (const [_, data] of Object.entries(studentsByClass)) {
           const { data: resData, error: resError } = await supabase.from('resources').insert({
             teacher_id: teacherId,
             class_id: data.actual_class_id,
             subject_id: data.subject_id,
             title: resourceTitle,
             description: resourceSections ? `Includes: ${resourceSections.join(', ')}` : undefined,
             type: 'link',
             audience: 'students',
             student_ids: data.students,
             url: 'pending'
           }).select('id').single()

           if (!resError && resData) {
             await supabase.from('resources').update({ url: `/student/resources/viewer?id=${resData.id}` }).eq('id', resData.id)

             if (data.students.length > 0) {
               const selectedUserIds = data.students.map(sId => {
                 for (const c of teacherClasses) {
                   const student = c.students.find(s => s.id === sId)
                   if (student) return student.user_id
                 }
                 return null
               }).filter(Boolean) as string[]

                if (selectedUserIds.length > 0) {
                  const notifications = selectedUserIds.map(uid => ({
                    user_id: uid,
                    title: '📚 New Resource Shared',
                    body: `Your teacher specifically shared a resource with you: ${resourceTitle}`,
                    type: 'resource',
                    data: { resource_id: resData.id }
                  }))
                  await supabase.from('notifications').insert(notifications)
                  const { sendPushNotification } = await import('@/app/actions/push')
                  await sendPushNotification(selectedUserIds, {
                    title: '📚 New Resource Shared',
                    body: `Your teacher shared a resource with you: ${resourceTitle}`,
                    href: `/student/resources/viewer?id=${resData.id}`,
                    tag: 'resource-shared',
                  })
                }
             }
           } else {
             console.error('Error creating resource for students:', resError)
           }
         }
      }

      setIsSent(true)
      setTimeout(() => { 
        setIsSent(false)
        setSelectedClasses([])
        setSelectedStudents([])
        onClose() 
      }, 2000)
    } catch (e) {
      console.error("Error creating assignments:", e)
    } finally {
      setIsSending(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const allStudents = teacherClasses.flatMap(c => c.students)
  const filteredStudents = allStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  if (!isOpen) return null

  const modes: { id: ShareMode, label: string, icon: React.ReactNode }[] = [
    { id: 'class', label: 'Share to Class', icon: <Users size={18} /> },
    { id: 'student', label: 'Share to Student', icon: <User size={18} /> },
    { id: 'link', label: 'Share by Link', icon: <Link2 size={18} /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={18} /> }
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl mx-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-0 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl shrink-0">
              <Share2 size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Share Resource</h2>
              <p className="text-slate-500 text-sm font-medium mt-0.5">"{resourceTitle}"</p>
              {resourceSections && resourceSections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase mr-1 self-center">Includes:</span>
                  {resourceSections.map(s => (
                    <span key={s} className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  mode === m.id 
                    ? 'text-emerald-600 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' 
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto min-h-[300px]">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <p className="font-bold">Fetching your classes...</p>
            </div>
          ) : isSent ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Sent Successfully!</h3>
              <p className="text-slate-500">Resource has been securely assigned in the database.</p>
            </div>
          ) : mode === 'class' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 font-medium">Select from your assigned classes:</p>
              {teacherClasses.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-500 font-bold">You don't have any classes assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherClasses.map(cls => (
                    <div key={cls.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${selectedClasses.includes(cls.id) ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleClass(cls.id)}>
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedClasses.includes(cls.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                            {selectedClasses.includes(cls.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{cls.name}</p>
                            <p className="text-xs text-slate-500">{cls.subject} · {cls.studentCount} students</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setExpandedClass(expandedClass === cls.id ? null : cls.id) }} className="text-slate-400">
                          <ChevronRight size={18} className={`transition-transform ${expandedClass === cls.id ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                      {expandedClass === cls.id && (
                        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {cls.students.length > 0 ? cls.students.map(s => (
                              <span key={s.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">{s.avatar}</span>
                                {s.name}
                              </span>
                            )) : <span className="text-xs text-slate-400 font-bold">No students in this class.</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2"><Clock size={12} className="inline mr-1" />Due Date (Optional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Mastery (%)</label>
                  <input type="number" min="0" max="100" value={targetMastery} onChange={e => setTargetMastery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </div>
          ) : mode === 'student' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student by name..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-slate-400 py-4 font-bold">No students found.</p>
                ) : filteredStudents.map(s => (
                  <div key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStudents.includes(s.id) ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedStudents.includes(s.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {selectedStudents.includes(s.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-sm flex items-center justify-center font-bold">{s.avatar}</div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-slate-500">{teacherClasses.find(c => c.students.some(st => st.id === s.id))?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : mode === 'link' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Generated Link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={generatedLink} className="flex-1 bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono text-slate-600" />
                  <button onClick={copyLink} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${linkCopied ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}>
                    {linkCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['View Only', 'Study Mode', 'Download Allowed', 'Password Protected'].map(perm => (
                  <label key={perm} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{perm}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2"><Lock size={12} className="inline mr-1" />Link Expiry</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-2xl p-6">
                <p className="text-xs font-bold text-green-600 uppercase mb-3">Preview WhatsApp Message</p>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="font-black text-slate-900 dark:text-white">Peak Performance Tutoring 📚</p>
                  <br />
                  <p>You have been assigned:</p>
                  <p className="font-bold text-emerald-600">{resourceTitle}</p>
                  <br />
                  <p>Open Resource: <span className="text-blue-600 underline">peakcampus.co.ke/r/...</span></p>
                  <br />
                  <p className="text-slate-400 text-xs">Best of luck! 🎯</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Share to:</p>
                {teacherClasses.map(cls => (
                  <label key={cls.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={selectedClasses.includes(cls.id)} onChange={() => toggleClass(cls.id)} className="accent-green-500 w-4 h-4" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cls.name} {cls.subject} Group</span>
                    <span className="ml-auto text-xs text-slate-400">{cls.studentCount} students</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSent && mode !== 'link' && !loadingData && (
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-end">
            <button
              onClick={handleSend}
              disabled={isSending || (mode === 'class' ? selectedClasses.length === 0 : mode === 'student' ? selectedStudents.length === 0 : selectedClasses.length === 0)}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              {isSending ? 'Assigning...' : 
               mode === 'class' ? `Assign to ${selectedClasses.length} Class${selectedClasses.length !== 1 ? 'es' : ''}` :
               mode === 'student' ? `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}` :
               'Assign and Send via WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
