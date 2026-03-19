'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Stamp, Save, Upload, Trash2, 
  Settings, Layout, Type
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function TranscriptBrandingPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    school_name: '',
    director_name: '',
    address_line_1: '',
    address_line_2: '',
    logo_url: '',
    stamp_url: '',
    director_signature_url: ''
  })

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    setLoading(true)
    const { data } = await supabase.from('transcript_config').select('*').single()
    if (data) setConfig(data)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('transcript_config')
      .upsert({ ...config, updated_at: new Date().toISOString() })
    
    if (error) toast.error('Failed to save configuration')
    else toast.success('Branding updated!')
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-center opacity-50">Loading branding settings...</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Stamp className="text-primary" /> Transcript Branding
          </h1>
          <p className="text-sm text-muted-foreground">Customize how official reports look for students and parents.</p>
        </div>
        <Button onClick={handleSave} isLoading={saving}>
          <Save size={16} className="mr-2" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2 mb-2"><Type size={18} /> Basic Info</h3>
            <Input 
              label="School / Institution Name" 
              value={config.school_name} 
              onChange={e => setConfig({ ...config, school_name: e.target.value })} 
            />
            <Input 
              label="Director Name / Title" 
              value={config.director_name} 
              onChange={e => setConfig({ ...config, director_name: e.target.value })} 
            />
            <Input 
              label="Address Line 1" 
              value={config.address_line_1 || ''} 
              onChange={e => setConfig({ ...config, address_line_1: e.target.value })} 
            />
            <Input 
              label="Address Line 2" 
              value={config.address_line_2 || ''} 
              onChange={e => setConfig({ ...config, address_line_2: e.target.value })} 
            />
         </Card>

         <Card className="p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2 mb-2"><Layout size={18} /> Visual Assets</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">School Logo URL</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://..." 
                      value={config.logo_url || ''} 
                      onChange={e => setConfig({ ...config, logo_url: e.target.value })} 
                    />
                    <Button variant="secondary" size="sm"><Upload size={14} /></Button>
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Stamp / Seal URL</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://..." 
                      value={config.stamp_url || ''} 
                      onChange={e => setConfig({ ...config, stamp_url: e.target.value })} 
                    />
                    <Button variant="secondary" size="sm"><Upload size={14} /></Button>
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Director Signature URL</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://..." 
                      value={config.director_signature_url || ''} 
                      onChange={e => setConfig({ ...config, director_signature_url: e.target.value })} 
                    />
                    <Button variant="secondary" size="sm"><Upload size={14} /></Button>
                  </div>
               </div>
            </div>
         </Card>
      </div>

      {/* Preview Card */}
      <Card className="p-8 bg-slate-50 border-2 border-dashed border-slate-200">
         <div className="text-center opacity-50 py-10">
            <h3 className="font-bold text-lg">{config.school_name || 'Your School Name'}</h3>
            <p className="text-xs">{config.address_line_1}</p>
            <div className="mt-8 flex justify-between max-w-md mx-auto">
               <div className="w-20 h-10 border-b border-black"></div>
               <div className="w-16 h-16 rounded-full border border-black/20 flex items-center justify-center text-[8px]">STAMP</div>
            </div>
            <p className="mt-4 text-[10px] uppercase font-bold tracking-widest">Real-time Preview of Branding</p>
         </div>
      </Card>
    </div>
  )
}
