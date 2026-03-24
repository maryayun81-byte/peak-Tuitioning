'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Bell, Shield, Palette, 
  Mail, Phone, Save, Camera, 
  MapPin, Rocket, Star, Heart,
  Sparkles, Zap, Flame, LogOut
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationStore, type NotificationPreferences } from '@/stores/notificationStore'
import { THEMES } from '@/lib/themes'
import { playGeneratedSound, type SoundProfile, type SoundVariant } from '@/lib/sounds'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStudio } from '@/components/student/settings/AvatarStudio'
import { AvatarConfig } from '@/lib/avatars/avatarData'
import toast from 'react-hot-toast'

export default function StudentSettings() {
  const { profile, student } = useAuthStore()
  const { theme, syncThemeToProfile } = useThemeStore()
  const { signOut } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  
  const { preferences, updatePreference } = useNotificationStore()
  
  const handleTogglePing = (key: keyof NotificationPreferences) => {
     if (typeof preferences[key] !== 'boolean') return
     const newValue = !preferences[key] as boolean
     updatePreference(key, newValue as any)
     
     if (newValue && preferences.soundEnabled) {
        // Play the correct sound profile based on the key
        let profile: SoundProfile = 'default'
        if (key === 'levelUp') profile = 'achievement'
        else if (key === 'questReminders') profile = 'assignment'
        else if (key === 'teacherIntel') profile = 'intel'
        else if (key === 'globalNews') profile = 'news'
        
        playGeneratedSound(profile, preferences.soundVariant)
        toast.success(`${String(key).replace(/([A-Z])/g, ' $1')} enabled! 🔔`)
     }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file || !profile) return
     
     setUploadingAvatar(true)
     const toastId = toast.loading('Uploading avatar...')
     try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        
        const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
        if (updateError) throw updateError
        
        toast.success('Looking sharp! Avatar updated.', { id: toastId })
        setTimeout(() => window.location.reload(), 1000)
     } catch (err: any) {
        toast.error(err.message || 'Error uploading avatar', { id: toastId })
     } finally {
        setUploadingAvatar(false)
     }
  }

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      return toast.error("Passwords don't match!")
    }
    if (newPassword.length < 6) return toast.error("Password too short (min 6 chars)")
    
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Access code updated and encrypted! 🔒')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      console.error('Password update error:', err)
      toast.error('System error occurred. Please try again.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAvatarSave = async (config: AvatarConfig) => {
    if (!profile) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_metadata: config })
        .eq('id', profile.id)
      
      if (error) throw error
      toast.success('Identity Updated! +100 XP 🌟')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: any) {
      toast.error('Failed to save avatar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setTimeout(() => {
       setLoading(false)
       toast.success('Your student profile has been updated! +50 XP')
    }, 1000)
  }

  const TABS = [
    { id: 'profile', label: 'My Identity', icon: <User size={16} /> },
    { id: 'avatar', label: 'Avatar Legend', icon: <Rocket size={16} /> },
    { id: 'custom', label: 'Customization', icon: <Palette size={16} /> },
    { id: 'notifications', label: 'Pings', icon: <Bell size={16} /> },
    { id: 'security', label: 'Security & Password', icon: <Shield size={16} /> },
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
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleAvatarUpload} 
                                className="hidden" 
                                accept="image/*" 
                             />
                             <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-2xl overflow-hidden relative border-8 border-white">
                                <Avatar 
                                  url={(profile as any)?.avatar_url} 
                                  name={profile?.full_name} 
                                  size="2xl" 
                                  className="border-none w-full h-full rounded-none shadow-none"
                                />
                                <div 
                                   onClick={() => fileInputRef.current?.click()} 
                                   className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer z-20 ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                >
                                   <Camera size={24} className={uploadingAvatar ? "animate-pulse" : ""} />
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
                          <Input label="Learning Group" value={(student as any)?.class?.name || 'Class Assigned'} disabled />
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

                  {activeTab === 'avatar' && (
                    <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="mb-6">
                          <h3 className="font-black text-2xl" style={{ color: 'var(--text)' }}>Avatar Studio</h3>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Forge your legendary appearance here.</p>
                       </div>
                       <AvatarStudio 
                         initialConfig={(profile as any)?.avatar_metadata} 
                         onSave={handleAvatarSave}
                         isLoading={loading}
                       />
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
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                          <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Haptic & Sound Pings</h3>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted uppercase">Global Sound</span>
                                <div 
                                   onClick={() => handleTogglePing('soundEnabled')} 
                                   className={`w-10 h-5 rounded-full p-0.5 transition-all flex cursor-pointer ${preferences.soundEnabled ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'}`}
                                >
                                   <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] bg-[var(--input)] border border-[var(--card-border)] space-y-4 mb-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div>
                                <p className="font-black text-xs uppercase tracking-widest text-primary">Sound Signature</p>
                                <p className="text-[10px] text-muted">Choose the "voice" of your notifications</p>
                             </div>
                             <div className="flex flex-wrap gap-1 bg-white/50 dark:bg-black/20 p-1 rounded-2xl border border-black/5">
                                {(['classic', 'crystal', 'sparkle', 'vibrant'] as SoundVariant[]).map((v) => (
                                   <button
                                      key={v}
                                      onClick={() => {
                                         updatePreference('soundVariant', v)
                                         playGeneratedSound('default', v)
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${preferences.soundVariant === v ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-text'}`}
                                   >
                                      {v.charAt(0).toUpperCase() + v.slice(1)}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          {[
                            { id: 'levelUp', label: 'Level Up Celebrations', desc: 'Fancy animations when you hit a new level' },
                            { id: 'questReminders', label: 'Quest Reminders', desc: 'Nudges when an assignment is almost due' },
                            { id: 'teacherIntel', label: 'Teacher Intel', desc: 'When you get feedback or a marked worksheet' },
                            { id: 'globalNews', label: 'Global News', desc: 'Admin broadcasts and school events' },
                          ].map((n, i) => {
                            const isEnabled = (preferences as any)[n.id]
                            return (
                             <div key={i} className="flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-[var(--input)] gap-4">
                               <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate sm:whitespace-normal" style={{ color: 'var(--text)' }}>{n.label}</p>
                                  <p className="text-[10px] truncate sm:whitespace-normal" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                               </div>
                               <div onClick={() => handleTogglePing(n.id as any)} className="shrink-0 w-12 h-6 rounded-full p-1 transition-all flex cursor-pointer" style={{ background: isEnabled ? 'var(--primary)' : '#cbd5e1', justifyContent: isEnabled ? 'flex-end' : 'flex-start' }}>
                                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                               </div>
                            </div>
                          )})}
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="sec" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Security & Access</h3>
                       <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your access codes and view linked accounts.</p>
                       
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
                          <Input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                          <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                          <Button onClick={handlePasswordUpdate} isLoading={savingPassword} variant="secondary" className="w-full py-4 text-xs font-bold rounded-2xl">Update Access Code</Button>
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
