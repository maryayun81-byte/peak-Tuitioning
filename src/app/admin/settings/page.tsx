'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Upload, Stamp, Signature, Image as ImageIcon, Plus, Palette, ChevronRight, Key, Copy, RefreshCw } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { THEMES } from '@/lib/themes'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import { SignatureManager } from '@/components/admin/SignatureManager'

export default function AdminSettings() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const { theme: currentTheme } = useThemeStore()
  const [loading, setLoading] = useState(true)
  const [branding, setBranding] = useState({
    logo_url: '',
    stamp_url: '',
    signature_data: '',
    signature_type: 'draw',
    signature_font: '',
    school_name: 'Peak Performance Tutoring',
    transcript_watermark: 'OFFICIAL TRANSCRIPT',
    default_remarks: 'Excellent performance. Keep it up!',
    apply_transcripts: true,
    apply_certificates: false,
    apply_badges: false,
    director_name: 'Director General'
  })
  const [activeKey, setActiveKey] = useState<any>(null)
  const [keyLoading, setKeyLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('transcript_config').select('*').single()
      
      if (data) {
        setBranding({
          ...branding,
          ...data,
          signature_data: data.signature_data || '',
          signature_type: data.signature_type || 'draw',
          signature_font: data.signature_font || '',
          apply_transcripts: data.apply_transcripts ?? true,
          apply_certificates: data.apply_certificates ?? false,
          apply_badges: data.apply_badges ?? false,
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  const saveBranding = async () => {
    try {
      const { error } = await supabase
        .from('transcript_config')
        .upsert({
          id: (branding as any).id,
          school_name: branding.school_name,
          director_name: branding.director_name,
          logo_url: branding.logo_url,
          stamp_url: branding.stamp_url,
          signature_data: branding.signature_data,
          signature_type: branding.signature_type,
          signature_font: branding.signature_font,
          apply_transcripts: branding.apply_transcripts,
          apply_certificates: branding.apply_certificates,
          apply_badges: branding.apply_badges,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      toast.success('System settings and signature saved!')
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message)
    }
  }


  const generateTeacherKey = async () => {
    setKeyLoading(true)
    try {
      const keyStr = Math.random().toString(36).substring(2, 10).toUpperCase()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('teacher_registration_keys')
        .insert({
          key: keyStr,
          expires_at: expiresAt
        })
        .select()
        .single()
      
      if (error) throw error
      setActiveKey(data)
      toast.success('Access key generated! Share it with the teacher.')
    } catch (err: any) {
      toast.error('Failed to generate key: ' + err.message)
    } finally {
      setKeyLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>System Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure branding, grading, and portal defaults</p>
      </motion.div>

      {/* Branding & Assets */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <ImageIcon size={20} className="text-primary" /> School Branding & Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>School Logo</span>
               <Badge variant="info">TRANSCRIPTS</Badge>
            </div>
            <div className="aspect-square w-24 mx-auto rounded-2xl flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--card-border)' }}>
              <ImageIcon size={32} className="text-muted" />
            </div>
            <Button size="sm" variant="secondary" className="w-full"><Upload size={14} className="mr-2" /> Upload Logo</Button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Appears on all dashboards and reports.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Official Stamp</span>
               <Badge variant="warning">STAMP</Badge>
            </div>
            <div className="aspect-square w-24 mx-auto rounded-full flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--card-border)' }}>
              <Stamp size={32} className="text-muted" />
            </div>
            <Button size="sm" variant="secondary" className="w-full"><Upload size={14} className="mr-2" /> Upload Stamp</Button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Appears as watermark and footer on transcripts.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Official Admin Signature</span>
                 <span className="text-[10px] opacity-60">Draw or type your legal signature for document authorization.</span>
               </div>
                <div className="flex gap-1">
                  {branding.apply_transcripts && <Badge variant="success">TRANSCRIPTS</Badge>}
                  {branding.apply_certificates && <Badge variant="info">CERTIFICATES</Badge>}
                  {branding.apply_badges && <Badge variant="primary">BADGES</Badge>}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SignatureManager 
                value={branding.signature_data}
                type={branding.signature_type as any}
                font={branding.signature_font}
                onChange={(sig) => setBranding({
                  ...branding, 
                  signature_data: sig.data,
                  signature_type: sig.type,
                  signature_font: sig.font || ''
                })}
              />
              
              <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-widest opacity-50 mb-2">Visibility Controls</div>
                <div className="space-y-3">
                  {[
                    { id: 'apply_transcripts', label: 'Apply to Transcripts', description: 'Show signature on official terminal reports.' },
                    { id: 'apply_certificates', label: 'Apply to Certificates', description: 'Show signature on course completion awards.' },
                    { id: 'apply_badges', label: 'Apply to Badges', description: 'Show signature on physical badge prints.' },
                  ].map((toggle) => (
                    <label key={toggle.id} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input)] cursor-pointer hover:bg-white transition-colors">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 rounded border-2 border-primary accent-primary"
                        checked={(branding as any)[toggle.id]}
                        onChange={(e) => setBranding({ ...branding, [toggle.id]: e.target.checked })}
                      />
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{toggle.label}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{toggle.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Themes & Appearance */}
      <section className="space-y-4">
         <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Palette size={20} className="text-primary" /> Portal Appearance
         </h2>
         <Card className="p-6">
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Choose a visual style that inspires your administrative workflow.</p>
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
         </Card>
      </section>

      {/* General Config */}
      <section className="space-y-4">
         <Card className="p-6">
           <h3 className="font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Settings size={18} /> General Configuration
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="School Name" value={branding.school_name} onChange={e => setBranding({...branding, school_name: e.target.value})} />
              <Input label="Transcript Watermark Text" value={branding.transcript_watermark} onChange={e => setBranding({...branding, transcript_watermark: e.target.value})} />
              <div className="md:col-span-2">
                 <Textarea label="Default Transcript Remarks" rows={3} value={branding.default_remarks} onChange={e => setBranding({...branding, default_remarks: e.target.value})} />
              </div>
           </div>
           <Button className="mt-6" onClick={saveBranding}><Save size={16} className="mr-2" /> Save Changes</Button>
         </Card>
      </section>

      {/* Teacher Access Control */}
      <section className="space-y-4">
         <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Key size={20} className="text-primary" /> Teacher Access Control
         </h2>
         <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="space-y-1">
                  <h3 className="font-bold" style={{ color: 'var(--text)' }}>Registration Security</h3>
                  <p className="text-xs max-w-md" style={{ color: 'var(--text-muted)' }}>
                     Enhance security by requiring a one-time key for teacher registration. 
                     Generated keys last for 5 minutes and expire immediately after one use.
                  </p>
               </div>
               
               <div className="flex flex-col items-center gap-4">
                  {activeKey && new Date(activeKey.expires_at) > new Date() && !activeKey.used_at ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                        <span className="text-2xl font-black tracking-widest font-mono text-primary">{activeKey.key}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(activeKey.key)
                            toast.success('Key copied!')
                          }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Copy size={16} className="text-primary" />
                        </button>
                      </div>
                      <div className="text-[10px] flex items-center gap-2 font-bold text-amber-600">
                        <RefreshCw size={10} className="animate-spin" /> 
                        Expires {new Date(activeKey.expires_at).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ) : (
                    <Button onClick={generateTeacherKey} isLoading={keyLoading}>
                      <Plus size={16} className="mr-2" /> Generate Access Key
                    </Button>
                  )}
               </div>
            </div>
         </Card>
      </section>

    </div>
  )
}
