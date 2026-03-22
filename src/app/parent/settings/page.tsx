'use client'

import { useState,useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  User, Bell, Shield, Palette, 
  Mail, Phone, Save, Camera, 
  MapPin, Heart, ShieldCheck,
  CreditCard, Smartphone, LogOut
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { THEMES } from '@/lib/themes'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function ParentSettings() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const { theme: currentTheme, syncThemeToProfile } = useThemeStore()
  const { signOut } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [students, setStudents] = useState<any[]>([])
  const [guardianData, setGuardianData] = useState({
    phone: '',
    emergency_contact: '',
    home_address: '',
    mpesa_push_enabled: false,
    currency: 'KES'
  })
 
   useEffect(() => {
     if (parent?.id) {
       // Fetch linked students
       supabase
         .from('parent_student_links')
         .select('student:students(*, class:classes(name))')
         .eq('parent_id', parent.id)
         .then(({ data }) => {
            const linked = data?.map((link: any) => link.student).filter(Boolean) || []
            setStudents(linked)
         })

       // Fetch parent specific settings
       supabase
         .from('parents')
         .select('*')
         .eq('id', parent.id)
         .single()
         .then(({ data }) => {
           if (data) {
             setGuardianData({
               phone: data.phone || '',
               emergency_contact: data.emergency_contact || '',
               home_address: data.home_address || '',
               mpesa_push_enabled: data.mpesa_push_enabled || false,
               currency: data.currency || 'KES'
             })
           }
         })
     }
   }, [parent?.id, supabase])
 
    const handleSave = async () => {
      if (!parent?.id) return
      
      setLoading(true)
      const { error } = await supabase
        .from('parents')
        .update({
          phone: guardianData.phone,
          emergency_contact: guardianData.emergency_contact,
          home_address: guardianData.home_address,
          mpesa_push_enabled: guardianData.mpesa_push_enabled,
          currency: guardianData.currency
        })
        .eq('id', parent.id)

      setLoading(false)
      if (error) {
        toast.error('Failed to update preferences')
        console.error(error)
      } else {
        toast.success('Parental preferences updated successfully!')
      }
    }
 
   const TABS = [
     { id: 'profile', label: 'Guardian Profile', icon: <User size={16} /> },
     { id: 'family', label: 'Linked Students', icon: <Heart size={16} /> },
     { id: 'billing', label: 'Billing Preferences', icon: <CreditCard size={16} /> },
     { id: 'security', label: 'Access Control', icon: <Shield size={16} /> },
     { id: 'theme', label: 'Appearance', icon: <Palette size={16} /> },
   ]
 
   return (
     <div className="p-6 max-w-4xl mx-auto space-y-8 pb-32">
       <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Guardian Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage family data, security, and financial preferences</p>
       </div>
 
       <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 space-y-1">
             {TABS.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}`}
               >
                 {tab.icon} {tab.label}
               </button>
             ))}
             <div className="pt-4 mt-4 border-t border-[var(--card-border)]">
                <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all">
                   <LogOut size={16} /> Sign Out
                </button>
             </div>
          </div>
 
          <div className="flex-1">
             <Card className="p-8 border-none shadow-2xl relative">
                <AnimatePresence mode="wait">
                   {activeTab === 'profile' && (
                     <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="flex items-center gap-6 mb-8">
                           <div className="w-24 h-24 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 border-4 border-white shadow-xl relative">
                              <User size={40} />
                              <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-md border border-[var(--card-border)]">
                                 <Camera size={14} className="text-primary" />
                              </button>
                           </div>
                           <div>
                              <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>{profile?.full_name}</h3>
                              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verified Guardian Account</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <Badge variant="success" className="text-[10px] px-2 py-0.5"><ShieldCheck size={12} className="mr-1" /> Family Secured</Badge>
                              </div>
                           </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Guardian Name" value={profile?.full_name} disabled />
                            <Input label="Email Address" value={profile?.email} disabled />
                            <Input 
                              label="Primary Phone" 
                              placeholder="+254 7XX XXX XXX" 
                              value={guardianData.phone}
                              onChange={(e) => setGuardianData({...guardianData, phone: e.target.value})}
                            />
                            <Input 
                              label="Emergency Contact" 
                              placeholder="+254 7XX XXX XXX" 
                              value={guardianData.emergency_contact}
                              onChange={(e) => setGuardianData({...guardianData, emergency_contact: e.target.value})}
                            />
                         </div>
                         <Textarea 
                            label="Home Address (Optional)" 
                            placeholder="For school logistics and pickups..." 
                            value={guardianData.home_address}
                            onChange={(e) => setGuardianData({...guardianData, home_address: e.target.value})}
                         />
                        
                        <div className="pt-4 flex justify-end">
                           <Button onClick={handleSave} isLoading={loading} className="px-10 py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"><Save size={16} className="mr-2" /> Save Profile</Button>
                        </div>
                     </motion.div>
                   )}
 
                   {activeTab === 'family' && (
                     <motion.div key="family" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Family Management</h3>
                        <div className="space-y-3">
                           {students.map((c, i) => (
                             <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-[var(--input)] border border-[var(--card-border)]">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-black text-xs text-primary shadow-sm border border-[var(--card-border)]">
                                      {c.full_name[0]}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black" style={{ color: 'var(--text)' }}>{c.full_name}</p>
                                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.class?.name || 'No Class'} • {c.admission_number}</p>
                                   </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50">Unlink</Button>
                             </div>
                           ))}
                           {students.length === 0 && (
                              <p className="text-center py-8 text-sm opacity-50">No students linked yet.</p>
                           )}
                        </div>
                        <div className="pt-6 border-t border-[var(--card-border)] flex justify-center">
                           <Link href="/parent/link">
                             <Button variant="secondary" className="px-8 rounded-2xl text-xs"><Heart size={14} className="mr-2" /> Link New Student</Button>
                           </Link>
                        </div>
                     </motion.div>
                   )}

                  {activeTab === 'billing' && (
                    <motion.div key="billing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Electronic Billing</h3>
                       
                       <div className="space-y-4">
                          <div className="flex items-center justify-between p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
                             <div className="flex items-center gap-4">
                                <Smartphone size={24} className="text-emerald-600" />
                                <div>
                                   <p className="font-bold text-sm text-emerald-900">Push-to-Mpesa</p>
                                   <p className="text-[10px] text-emerald-700">Receive payment prompts on your phone</p>
                                </div>
                             </div>
                             <button 
                               onClick={() => setGuardianData({...guardianData, mpesa_push_enabled: !guardianData.mpesa_push_enabled})}
                               className={`w-12 h-6 rounded-full p-1 flex transition-all ${guardianData.mpesa_push_enabled ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'}`}
                             >
                                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                             </button>
                          </div>
                       </div>

                        <section className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                           <label className="text-xs font-black uppercase tracking-widest text-muted">Currency Preference</label>
                           <Select 
                              className="w-48 text-xs font-bold"
                              value={guardianData.currency}
                              onChange={(e) => setGuardianData({...guardianData, currency: e.target.value})}
                           >
                              <option value="KES">KES - Kenya Shilling</option>
                              <option value="USD">USD - US Dollar</option>
                              <option value="EUR">EUR - Euro</option>
                           </Select>
                        </section>
                        
                        <div className="pt-6 flex justify-end">
                           <Button onClick={handleSave} isLoading={loading} className="px-10 py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"><Save size={16} className="mr-2" /> Save Billing</Button>
                        </div>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Account Access</h3>
                       <div className="space-y-4">
                          <Input type="password" label="Current Pin/Password" placeholder="••••" />
                          <Input type="password" label="New Password" placeholder="••••" />
                          <Input type="password" label="Confirm New Password" placeholder="••••" />
                          <Button className="w-full py-4 text-xs font-black rounded-2xl">Restore Shield</Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'theme' && (
                    <motion.div key="theme" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>Portal Appearance</h3>
                       <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a visual style that matches your preference.</p>
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                               <div className="h-12 w-full rounded-lg shadow-inner flex overflow-hidden border border-black/10">
                                  <div className="flex-1 h-full" style={{ background: t.bg }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.card }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.primary }}></div>
                                  <div className="flex-1 h-full" style={{ background: t.accent }}></div>
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
