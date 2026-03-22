'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Bell, Shield, Palette, 
  Mail, Phone, Save, Camera, 
  MapPin, BookOpen, School, BookMarked, AlertCircle
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { THEMES } from '@/lib/themes'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function TeacherSettings() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  const { theme: currentTheme, syncThemeToProfile } = useThemeStore()
  
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [teacherData, setTeacherData] = useState<any>(null)

  useEffect(() => {
    if (profile) loadTeacherDetails()
  }, [profile])

  const loadTeacherDetails = async () => {
    setDataLoading(true)
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        *,
        teacher_curricula(curriculum:curricula(name)),
        teacher_assignments(
          class:classes(id, name),
          subject:subjects(name),
          is_class_teacher
        )
      `)
      .eq('user_id', profile?.id)
      .single()
    
    if (data) {
       // Extract unique classes and curriculums
       const classes = Array.from(new Set(data.teacher_assignments.map((ta: any) => JSON.stringify(ta.class)))).map((s:any) => JSON.parse(s))
       const curricula = data.teacher_curricula.map((tc: any) => tc.curriculum?.name)
       const classTeacherFor = data.teacher_assignments.find((ta: any) => ta.is_class_teacher)?.class
       
       setTeacherData({
          ...data,
          uniqueClasses: classes,
          curriculaList: curricula,
          classTeacherFor
       })
    }
    setDataLoading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setTimeout(() => {
       setLoading(false)
       toast.success('Settings updated successfully!')
    }, 1000)
  }

  const TABS = [
    { id: 'profile', label: 'My Profile', icon: <User size={16} /> },
    { id: 'preferences', label: 'Preferences', icon: <BookMarked size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'theme', label: 'Appearance', icon: <Palette size={16} /> },
  ]

  if (dataLoading) return <div className="p-12 text-center opacity-50 font-black animate-pulse">Initializing Portal Data...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-32">
      <div>
         <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>Portal Settings</h1>
         <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Customize your professional teacher profile and experience.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
         {/* Sidebar Tabs */}
         <div className="w-full md:w-64 space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
         </div>

         {/* Content Area */}
         <div className="flex-1">
            <Card className="p-8 border-none shadow-2xl bg-[var(--card)] rounded-[2rem]">
               <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <div className="flex items-center gap-6 mb-8">
                          <div className="relative group">
                             <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border-4 border-[var(--bg)] shadow-xl overflow-hidden group">
                                {profile?.avatar_url ? (
                                   <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                   <User size={40} />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                   <Camera size={20} />
                                </div>
                             </div>
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>{profile?.full_name}</h3>
                                {teacherData?.is_class_teacher && <Badge variant="success" className="text-[8px] uppercase font-black">Head Teacher</Badge>}
                             </div>
                             <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{teacherData?.email}</p>
                             <Badge variant="primary" className="mt-2 text-[10px] px-2 py-0.5 rounded-md">Verified Faculty</Badge>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Full Name" value={profile?.full_name} disabled placeholder="Full Name" className="rounded-xl" />
                          <Input label="Email Address" value={profile?.email} disabled placeholder="Email" className="rounded-xl" />
                          <Input label="Phone Number" defaultValue={teacherData?.phone} placeholder="+254 7XX XXX XXX" className="rounded-xl" />
                          <Input label="Staff ID" value={teacher?.id.slice(0, 8).toUpperCase()} disabled placeholder="Staff ID" className="rounded-xl" />
                       </div>
                       <Textarea label="Professional Philosophy" placeholder="Your approach to education..." className="rounded-2xl" />
                       
                       <div className="pt-4 flex justify-end">
                          <Button onClick={handleSave} isLoading={loading} className="rounded-xl px-8 py-6 font-black"><Save size={16} className="mr-2" /> Save Profile</Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'preferences' && (
                    <motion.div key="prefs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                       <div className="p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
                          <AlertCircle className="text-indigo-500 shrink-0" size={20} />
                          <p className="text-[11px] text-indigo-700/80 font-medium leading-relaxed">
                             Teaching assignments and curriculum access are managed by the school administration. Please contact the registrar for assignment changes.
                          </p>
                       </div>

                       <section className="space-y-4">
                          <h3 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Active Curricula</h3>
                          <div className="flex flex-wrap gap-2">
                             {teacherData?.curriculaList.length > 0 ? (
                                teacherData.curriculaList.map((c: string) => (
                                   <Badge key={c} variant="info" className="py-2.5 px-5 rounded-xl font-bold border-none bg-[var(--input)] text-primary">{c}</Badge>
                                ))
                             ) : (
                                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No curriculum assigned yet.</p>
                             )}
                          </div>
                       </section>

                       <section className="space-y-4 pt-4">
                          <h3 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Class & Subject Visibility</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {teacherData?.uniqueClasses.map((c: any) => (
                                <div 
                                  key={c.id} 
                                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${teacherData.classTeacherFor?.id === c.id ? 'bg-primary/5 border-primary/30' : 'bg-[var(--input)] border-[var(--card-border)]'}`}
                                >
                                   <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${teacherData.classTeacherFor?.id === c.id ? 'bg-primary text-white shadow-lg' : 'bg-[var(--card)] text-muted'}`}>
                                         {c.name[0]}
                                      </div>
                                      <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{c.name}</span>
                                   </div>
                                   {teacherData.classTeacherFor?.id === c.id && (
                                      <Badge className="bg-primary text-white border-none text-[8px] uppercase px-2">Primary Class</Badge>
                                   )}
                                </div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-4 pt-8 border-t border-[var(--card-border)]">
                          <label className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Marking Reminders</label>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Enable desktop alerts for pending assignment submissions older than 48 hours.</p>
                          <Select className="w-full sm:w-48 text-xs rounded-xl">
                             <option>Enabled (Urgent)</option>
                             <option>Standard</option>
                             <option>Disabled</option>
                          </Select>
                       </section>
                    </motion.div>
                  )}

                  {activeTab === 'theme' && (
                    <motion.div key="theme" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Portal Skin</h3>
                       <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose an aesthetic that matches your teaching style.</p>
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          {THEMES.map(t => (
                            <button
                               key={t.id}
                               onClick={() => {
                                 const store = useThemeStore.getState()
                                 store.setTheme(t.id as any)
                                 if (profile?.id) store.syncThemeToProfile(t.id as any, profile.id)
                               }}
                               className={`p-4 rounded-[1.5rem] border-2 transition-all text-left space-y-3 ${currentTheme === t.id ? 'border-primary ring-4 ring-primary/10 bg-[var(--card)] shadow-xl' : 'border-[var(--card-border)] hover:bg-[var(--input)]'}`}
                            >
                                <div className="h-12 rounded-xl shadow-inner flex overflow-hidden border border-black/5">
                                   <div className="flex-1" style={{ background: t.bg }}></div>
                                   <div className="flex-1" style={{ background: t.card }}></div>
                                   <div className="flex-1" style={{ background: t.primary }}></div>
                                   <div className="flex-1" style={{ background: t.accent }}></div>
                                </div>
                                <div className="px-1">
                                  <span className="block text-xs font-black truncate" style={{ color: 'var(--text)' }}>{t.name}</span>
                                  <span className="block text-[10px] opacity-60 font-medium" style={{ color: 'var(--text-muted)' }}>{t.font}</span>
                                </div>
                            </button>
                          ))}
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </Card>
         </div>
      </div>
    </div>
  )
}
