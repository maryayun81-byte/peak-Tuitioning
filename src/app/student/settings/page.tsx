'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Bell, Shield, Palette, 
  Mail, Phone, Save, Camera, 
  MapPin, Rocket, Star, Heart,
  Sparkles, Zap, Flame, LogOut
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { THEMES } from '@/lib/themes'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function StudentSettings() {
  const { profile, student } = useAuthStore()
  const { theme, syncThemeToProfile } = useThemeStore()
  const { signOut } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const handleSave = async () => {
    setLoading(true)
    setTimeout(() => {
       setLoading(false)
       toast.success('Your student profile has been updated! +50 XP')
    }, 1000)
  }

  const TABS = [
    { id: 'profile', label: 'My Identity', icon: <User size={16} /> },
    { id: 'custom', label: 'Customization', icon: <Palette size={16} /> },
    { id: 'notifications', label: 'Pings', icon: <Bell size={16} /> },
    { id: 'security', label: 'Guardians', icon: <Shield size={16} /> },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-32">
      <div>
         <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Portal Customization</h1>
         <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tailor your learning hub and profile</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
         {/* Sidebar Tabs */}
         <div className="w-full md:w-64 space-y-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-[1.5rem] font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'text-[var(--text-muted)] hover:bg-[var(--input)] hover:translate-x-1'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-[var(--card-border)]">
               <button onClick={signOut} className="w-full flex items-center gap-3 px-5 py-4 rounded-[1.5rem] font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all">
                  <LogOut size={16} /> Sign Out
               </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1">
            <Card className="p-8 border-none shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
               
               <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="flex flex-col items-center gap-6 mb-8">
                          <div className="relative group">
                             <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-2xl overflow-hidden relative border-8 border-white">
                                <span className="text-5xl font-black">{profile?.full_name[0]}</span>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                   <Camera size={24} />
                                </div>
                             </div>
                             <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-amber-500 border-4 border-white flex items-center justify-center shadow-lg">
                                <Zap size={16} className="text-white fill-white" />
                             </div>
                          </div>
                          <div className="text-center">
                             <h3 className="font-black text-2xl" style={{ color: 'var(--text)' }}>{profile?.full_name}</h3>
                             <div className="flex items-center gap-2 justify-center mt-2">
                                <Badge variant="primary" className="text-[9px] px-3">Gold Student</Badge>
                                <Badge variant="info" className="text-[9px] px-3">Level 12</Badge>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input label="Display Name" value={profile?.full_name} disabled placeholder="Your name" />
                          <Input label="Email" value={profile?.email} disabled placeholder="Your email" />
                          <Input label="Admission No." value={student?.admission_number} disabled placeholder="Admission #" />
                          <Input label="Learning Group" value="Grade 8 Red" disabled />
                       </div>
                       
                       <section className="pt-6 border-t border-[var(--card-border)]">
                          <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-4">Personal Motto</h4>
                          <Textarea placeholder="What motivates you every day?" className="rounded-2xl" />
                       </section>

                       <div className="pt-4 flex justify-end">
                          <Button onClick={handleSave} isLoading={loading} className="px-10 py-6 rounded-[1.5rem] shadow-xl shadow-primary/20"><Save size={16} className="mr-2" /> Update Legend</Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'custom' && (
                    <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                       <div>
                          <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Portal Hub Themes</h3>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Choose a theme that matches your energy.</p>
                       </div>

                       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {THEMES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                const store = useThemeStore.getState()
                                store.setTheme(t.id as any)
                                if (profile?.id) store.syncThemeToProfile(t.id as any, profile.id)
                              }}
                              className={`p-4 rounded-[2rem] border-4 transition-all text-left space-y-4 ${theme === t.id ? 'border-primary bg-primary/5 scale-105' : 'border-transparent bg-[var(--input)] hover:translate-y-[-4px]'}`}
                            >
                               <div className="h-16 w-full rounded-2xl flex overflow-hidden border border-black/10">
                                  <div className="flex-1 h-full" style={{ background: t.bg }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.card }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.primary }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.accent }}></div>
                               </div>
                               <div>
                                 <span className="block text-[11px] font-black uppercase tracking-widest truncate" style={{ color: 'var(--text)' }}>{t.name}</span>
                                 <span className="block text-[9px] opacity-70 mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>{t.font}</span>
                               </div>
                            </button>
                          ))}
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div key="notif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Haptic & Sound Pings</h3>
                       
                       <div className="space-y-3">
                          {[
                            { label: 'Level Up Celebrations', desc: 'Fancy animations when you hit a new level', enabled: true },
                            { label: 'Quest Reminders', desc: 'Nudges when an assignment is almost due', enabled: true },
                            { label: 'Teacher Intel', desc: 'When you get feedback or a marked worksheet', enabled: true },
                            { label: 'Global News', desc: 'Admin broadcasts and school events', enabled: false },
                          ].map((n, i) => (
                            <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-[var(--input)]">
                               <div>
                                  <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{n.label}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                               </div>
                               <div className={`w-12 h-6 rounded-full p-1 transition-all flex cursor-pointer ${n.enabled ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}>
                                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                               </div>
                            </div>
                          ))}
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="sec" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Linked Guardians</h3>
                       <p className="text-sm" style={{ color: 'var(--text-muted)' }}>The people looking out for your progress.</p>
                       
                       <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex gap-4">
                          <Heart className="text-indigo-500 shrink-0" size={24} />
                          <div>
                             <p className="font-black text-indigo-900">Guardian Account Linked</p>
                             <p className="text-xs text-indigo-700 mt-1">
                                Your progress, attendance and successes are shared with your linked parent account. 
                             </p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-xs font-black uppercase tracking-widest text-muted">Portal Password</label>
                          <Input type="password" placeholder="New Password" />
                          <Input type="password" placeholder="Confirm New Password" />
                          <Button variant="secondary" className="w-full py-4 text-xs font-bold rounded-2xl">Update Access Code</Button>
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
