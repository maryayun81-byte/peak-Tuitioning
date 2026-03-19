'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

export default function TeacherSettings() {
  const { profile, teacher } = useAuthStore()
  const { theme: currentTheme, syncThemeToProfile } = useThemeStore()
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const handleSave = async () => {
    setLoading(true)
    // Simulate save
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
         <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Portal Settings</h1>
         <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Customize your teacher experience and profile</p>
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
            <Card className="p-8">
               <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <div className="flex items-center gap-6 mb-8">
                          <div className="relative group">
                             <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border-4 border-[var(--bg)] shadow-xl overflow-hidden">
                                <User size={40} />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                   <Camera size={20} />
                                </div>
                             </div>
                          </div>
                          <div>
                             <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>{profile?.full_name}</h3>
                             <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Professional Teacher Account</p>
                             <Badge variant="primary" className="mt-2 text-[10px] px-2 py-0.5">Faculty Member</Badge>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Full Name" value={profile?.full_name} disabled placeholder="Full Name" />
                          <Input label="Email Address" value={profile?.email} disabled placeholder="Email" />
                          <Input label="Phone Number" placeholder="+254 7XX XXX XXX" />
                          <Input label="Staff ID" value={teacher?.id.slice(0, 8)} disabled placeholder="Staff ID" />
                       </div>
                       <Textarea label="Professional Bio" placeholder="Tell us about your teaching philosophy..." />
                       
                       <div className="pt-4 flex justify-end">
                          <Button onClick={handleSave} isLoading={loading}><Save size={16} className="mr-2" /> Save Changes</Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'preferences' && (
                    <motion.div key="prefs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
                          <AlertCircle className="text-amber-500 shrink-0" size={20} />
                          <p className="text-xs text-amber-800 leading-relaxed">
                             Your basic teaching assignments (Curriculums & Classes) are managed by the Administrator. If you notice any discrepancies, please contact the admin office.
                          </p>
                       </div>

                       <section className="space-y-4">
                          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Curriculum Assignment</h3>
                          <div className="flex flex-wrap gap-2">
                             {['British National', '8-4-4 System', 'Cambridge IGCSE'].map(c => (
                               <Badge key={c} variant="info" className="py-2 px-4 rounded-xl">{c}</Badge>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-4 pt-4">
                          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Class Visibility</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                             {['Grade 7 Blue', 'Grade 8 Red', 'Swift Stream', 'Eagle Wing'].map(c => (
                               <div key={c} className="p-3 rounded-xl bg-[var(--input)] text-[10px] font-bold text-center border border-[var(--card-border)]" style={{ color: 'var(--text)' }}>{c}</div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                          <label className="text-xs font-bold" style={{ color: 'var(--text)' }}>Automatic Marking Reminders</label>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Remind me when assignments are pending for more than 48 hours.</p>
                          <Select className="w-48 text-xs">
                             <option>Enabled</option>
                             <option>Disabled</option>
                          </Select>
                       </section>
                    </motion.div>
                  )}

                  {activeTab === 'theme' && (
                    <motion.div key="theme" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                       <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Portal Themes</h3>
                       <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a visual style that inspires your teaching.</p>
                       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {THEMES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                const store = useThemeStore.getState()
                                store.setTheme(t.id as any)
                                if (profile?.id) store.syncThemeToProfile(t.id as any, profile.id)
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all text-left space-y-3 ${currentTheme === t.id ? 'border-primary ring-4 ring-primary/10 bg-[var(--card)]' : 'border-[var(--card-border)] hover:bg-[var(--input)]'}`}
                            >
                               <div className="h-10 rounded-lg shadow-inner flex overflow-hidden border border-black/10">
                                  <div className="flex-1" style={{ background: t.bg }}></div>
                                  <div className="flex-1" style={{ background: t.card }}></div>
                                  <div className="flex-1" style={{ background: t.primary }}></div>
                                  <div className="flex-1" style={{ background: t.accent }}></div>
                               </div>
                               <div>
                                 <span className="block text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{t.name}</span>
                                 <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.font}</span>
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
