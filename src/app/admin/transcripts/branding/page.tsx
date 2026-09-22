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

  const [uploading, setUploading] = useState<string | null>(null)

  const loadConfig = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transcript_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) setConfig(data)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Singleton: reuse the existing row id so saves update instead of piling rows.
    const { data: existing } = await supabase
      .from('transcript_config')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const { error } = await supabase
      .from('transcript_config')
      .upsert({ ...(existing?.id ? { id: existing.id } : {}), ...config, updated_at: new Date().toISOString() })

    if (error) toast.error('Failed to save configuration')
    else toast.success('Branding updated! Transcripts pick it up immediately.')
    setSaving(false)
  }

  const uploadAsset = async (field: 'logo_url' | 'stamp_url' | 'director_signature_url', file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    setUploading(field)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${field}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('branding').upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (error) throw error
      const { data } = supabase.storage.from('branding').getPublicUrl(path)
      setConfig((c: any) => ({ ...c, [field]: data.publicUrl }))
      toast.success('Uploaded — remember to Save Changes.')
    } catch (e: any) {
      toast.error('Upload failed: ' + (e.message || 'please try again'))
    } finally {
      setUploading(null)
    }
  }

  const assetPicker = (field: 'logo_url' | 'stamp_url' | 'director_signature_url', accept = 'image/*') => (
    <label className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border border-[var(--card-border)] hover:border-primary transition-colors ${uploading === field ? 'opacity-50 pointer-events-none' : ''}`}>
      <Upload size={14} /> {uploading === field ? '…' : 'Upload'}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) uploadAsset(field, f)
        }}
      />
    </label>
  )

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
                    {assetPicker('logo_url')}
                  </div>
                  {config.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logo_url} alt="Logo preview" className="mt-2 h-14 object-contain" />
                  )}
               </div>
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Stamp / Seal URL</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={config.stamp_url || ''}
                      onChange={e => setConfig({ ...config, stamp_url: e.target.value })}
                    />
                    {assetPicker('stamp_url')}
                  </div>
                  {config.stamp_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.stamp_url} alt="Stamp preview" className="mt-2 h-14 object-contain" />
                  )}
               </div>
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Director Signature URL</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={config.director_signature_url || ''}
                      onChange={e => setConfig({ ...config, director_signature_url: e.target.value })}
                    />
                    {assetPicker('director_signature_url')}
                  </div>
                  {config.director_signature_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.director_signature_url} alt="Signature preview" className="mt-2 h-14 object-contain" />
                  )}
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
