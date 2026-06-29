'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, Gift, X, AlertTriangle, ImagePlus, Upload, MessageSquareQuote, UsersRound, Wallet } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { formatDate, getEventWeeks } from '@/lib/utils'
import type { TuitionEvent } from '@/types/database'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function formatEventCharge(event: any) {
  const amount = Number(event.charge_amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Charges not set'
  const currency = event.charge_currency || 'KES'
  const unit = event.charge_unit_label || event.charge_frequency?.replace(/_/g, ' ') || 'per programme'
  return `${currency} ${amount.toLocaleString()} ${unit}`
}

function formatSlotCharge(slot: Partial<ClassSlotRow> | ClassSlotDraft | undefined, fallback?: any) {
  const amount = Number((slot as any)?.charge_amount)
  if (Number.isFinite(amount) && amount > 0) {
    const currency = (slot as any)?.charge_currency || fallback?.charge_currency || 'KES'
    const unit = (slot as any)?.charge_unit_label || (slot as any)?.charge_frequency?.replace(/_/g, ' ') || fallback?.charge_unit_label || fallback?.charge_frequency?.replace(/_/g, ' ') || 'per programme'
    return `${currency} ${amount.toLocaleString()} ${unit}`
  }
  return formatEventCharge(fallback)
}

function formatSessionTime(event: any) {
  if (!event.session_start_time && !event.session_end_time) return 'Time not set'
  const start = String(event.session_start_time || '').slice(0, 5)
  const end = String(event.session_end_time || '').slice(0, 5)
  return [start, end].filter(Boolean).join(' - ')
}

function normalizeEventPosterUrl(rawValue: string) {
  const raw = String(rawValue || '').trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  const cleanPath = raw
    .replace(/^event-posters\//, '')
    .replace(/^public\//, '')
    .replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return raw
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/event-posters/${cleanPath}`
}

function getEventPosterUrl(event: any) {
  return normalizeEventPosterUrl(event?.banner_url || event?.poster_url || event?.image_url || '') || ''
}

interface Holiday {
  id: string
  name: string
  date: string
  type: 'public' | 'custom'
}

type ClassSlotRow = {
  event_id: string
  curriculum_id: string
  class_id: string
  capacity: number
  charge_amount?: number | null
  charge_currency?: string | null
  charge_frequency?: string | null
  charge_unit_label?: string | null
  pricing_note?: string | null
}

type ClassSlotDraft = {
  capacity: number | ''
  charge_amount: number | ''
  charge_frequency: string
  charge_unit_label: string
  pricing_note: string
}

const schema = z.object({
  name: z.string().min(2),
  start_date: z.string(),
  end_date: z.string(),
  banner_url: z.string().optional().or(z.literal('')),
  banner_object_position: z.string().default('center center'),
  banner_overlay_strength: z.preprocess(
    (value) => (typeof value === 'number' && Number.isNaN(value)) || value === '' ? 70 : value,
    z.number().min(0).max(95).default(70)
  ),
  charge_amount: z.preprocess(
    (value) => (typeof value === 'number' && Number.isNaN(value)) || value === '' ? null : value,
    z.number().min(0).nullable().optional()
  ),
  charge_currency: z.string().default('KES'),
  charge_frequency: z.string().optional().or(z.literal('')),
  charge_unit_label: z.string().optional().or(z.literal('')),
  pricing_note: z.string().optional().or(z.literal('')),
  event_location: z.string().optional().or(z.literal('')),
  session_start_time: z.string().optional().or(z.literal('')),
  session_end_time: z.string().optional().or(z.literal('')),
  active_days: z.array(z.string()).min(1),
  attendance_threshold: z.number().min(0).max(100).default(80),
  status: z.enum(['upcoming', 'active', 'postponed', 'cancelled', 'ended']).default('upcoming'),
  postponed_to: z.string().optional().or(z.literal('')),
})
type EventForm = z.infer<typeof schema>

export default function AdminTuitionEvents() {
  const supabase = getSupabaseBrowserClient()
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [search, setSearch] = useState('')
  const [curriculums, setCurriculums] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [eventSlots, setEventSlots] = useState<ClassSlotRow[]>([])
  const [classSlots, setClassSlots] = useState<Record<string, ClassSlotDraft>>({})
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<TuitionEvent | null>(null)
  const [holidayOpen, setHolidayOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<TuitionEvent | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' })
  const [activeTab, setActiveTab] = useState<'events' | 'weeks'>('events')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [origin, setOrigin] = useState('')

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      active_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      attendance_threshold: 80,
      status: 'upcoming',
      postponed_to: '',
      banner_url: '',
      banner_object_position: 'center center',
      banner_overlay_strength: 70,
      charge_amount: null,
      charge_currency: 'KES',
      charge_frequency: '',
      charge_unit_label: '',
      pricing_note: '',
      event_location: '',
      session_start_time: '',
      session_end_time: '',
    },
  })

  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied')
    } catch {
      toast.error('Clipboard is blocked. Select and copy the link manually.')
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, cRes, classRes, slotRes] = await Promise.all([
        supabase.from('tuition_events').select('*, curriculum:curriculums(name)').order('start_date', { ascending: false }),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('id, name, curriculum_id, level').order('level').order('name'),
        supabase.from('tuition_event_class_slots').select('event_id, curriculum_id, class_id, capacity, charge_amount, charge_currency, charge_frequency, charge_unit_label, pricing_note'),
      ])
      setEvents(tRes.data ?? [])
      setCurriculums(cRes.data ?? [])
      setClasses(classRes.data ?? [])
      setEventSlots((slotRes.data ?? []) as ClassSlotRow[])
    } catch (e) {
      console.error('Failed to load tuition events:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadHolidays = async (event: TuitionEvent) => {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', event.start_date)
      .lte('date', event.end_date)
      .order('date')
    setHolidays(data ?? [])
    setSelectedEvent(event)
    setHolidayOpen(true)
  }

  const addHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return
    const { error } = await supabase.from('holidays').insert({ ...newHoliday, type: 'custom' })
    if (error) { toast.error(error.message); return }
    toast.success('Holiday added!')
    setNewHoliday({ name: '', date: '' })
    if (selectedEvent) loadHolidays(selectedEvent)
  }

  const deleteHoliday = async (id: string, type: string) => {
    if (type === 'public') { toast.error('Cannot delete public holidays'); return }
    await supabase.from('holidays').delete().eq('id', id)
    toast.success('Holiday removed')
    if (selectedEvent) loadHolidays(selectedEvent)
  }

  const openEdit = (e: TuitionEvent) => {
    setEditing(e)
    setValue('name', e.name)
    setValue('start_date', e.start_date)
    setValue('end_date', e.end_date)
    setValue('active_days', e.active_days)
    setValue('banner_url', e.banner_url || '')
    setValue('banner_object_position', e.banner_object_position || 'center center')
    setValue('banner_overlay_strength', e.banner_overlay_strength ?? 70)
    setValue('charge_amount', e.charge_amount ?? null)
    setValue('charge_currency', e.charge_currency || 'KES')
    setValue('charge_frequency', e.charge_frequency || '')
    setValue('charge_unit_label', e.charge_unit_label || '')
    setValue('pricing_note', e.pricing_note || '')
    setValue('event_location', e.event_location || '')
    setValue('session_start_time', e.session_start_time || '')
    setValue('session_end_time', e.session_end_time || '')
    setValue('attendance_threshold', e.attendance_threshold)
    setValue('status', e.status || 'upcoming')
    setValue('postponed_to', e.postponed_to || '')
    const nextSlots: Record<string, ClassSlotDraft> = {}
    eventSlots
      .filter((slot) => slot.event_id === e.id)
      .forEach((slot) => {
        nextSlots[slot.class_id] = {
          capacity: Number(slot.capacity) || 0,
          charge_amount: slot.charge_amount == null ? '' : Number(slot.charge_amount),
          charge_frequency: slot.charge_frequency || '',
          charge_unit_label: slot.charge_unit_label || '',
          pricing_note: slot.pricing_note || '',
        }
      })
    setClassSlots(nextSlots)
    setAddOpen(true)
  }

  const onSubmit = async (data: any) => {
    // Keep is_active boolean synced for legacy queries
    data.is_active = data.status === 'active';
    if (!data.postponed_to) data.postponed_to = null;
    data.banner_url = normalizeEventPosterUrl(data.banner_url);
    if (!data.banner_object_position) data.banner_object_position = 'center center';
    if (data.banner_overlay_strength === undefined || data.banner_overlay_strength === null || Number.isNaN(data.banner_overlay_strength)) data.banner_overlay_strength = 70;
    if (data.charge_amount === undefined || data.charge_amount === null || Number.isNaN(data.charge_amount)) data.charge_amount = null;
    if (!data.charge_currency) data.charge_currency = 'KES';
    if (!data.charge_frequency) data.charge_frequency = null;
    if (!data.charge_unit_label) data.charge_unit_label = null;
    if (!data.pricing_note) data.pricing_note = null;
    if (!data.event_location) data.event_location = null;
    if (!data.session_start_time) data.session_start_time = null;
    if (!data.session_end_time) data.session_end_time = null;

    if (data.status === 'active') {
      await supabase.from('tuition_events').update({ is_active: false, status: 'ended' }).neq('id', editing?.id ?? '')
    }

    const eventMutation = editing
      ? await supabase.from('tuition_events').update(data).eq('id', editing.id).select('id').single()
      : await supabase.from('tuition_events').insert(data).select('id').single()
    const { data: savedEvent, error } = eventMutation
    if (error) { toast.error(error.message); return }

    const eventId = editing?.id || savedEvent?.id
    if (eventId) {
      const slotRows = classes.map((classItem) => ({
        event_id: eventId,
        curriculum_id: classItem.curriculum_id,
        class_id: classItem.id,
        capacity: Math.max(0, Number(classSlots[classItem.id]?.capacity) || 0),
        charge_amount: classSlots[classItem.id]?.charge_amount === '' || classSlots[classItem.id]?.charge_amount == null
          ? null
          : Math.max(0, Number(classSlots[classItem.id]?.charge_amount) || 0),
        charge_currency: data.charge_currency || 'KES',
        charge_frequency: classSlots[classItem.id]?.charge_frequency || data.charge_frequency || null,
        charge_unit_label: classSlots[classItem.id]?.charge_unit_label || data.charge_unit_label || null,
        pricing_note: classSlots[classItem.id]?.pricing_note || null,
      }))
      if (slotRows.length > 0) {
        const { error: slotError } = await supabase
          .from('tuition_event_class_slots')
          .upsert(slotRows, { onConflict: 'event_id,class_id' })
        if (slotError) {
          toast.error(`Event saved, but slots failed: ${slotError.message}`)
          return
        }
      }
    }

    toast.success(editing ? 'Event updated!' : 'Event created successfully!')
    reset(); setClassSlots({}); setEditing(null); setAddOpen(false); load()
  }

  const uploadBanner = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    setUploadingBanner(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('event-posters').upload(path, file, { upsert: true })
      if (error) {
        toast.error(`${error.message}. Create a public "event-posters" storage bucket if it does not exist yet.`)
        return
      }
      const { data } = supabase.storage.from('event-posters').getPublicUrl(path)
      setValue('banner_url', data.publicUrl)
      toast.success('Event banner uploaded')
    } finally {
      setUploadingBanner(false)
    }
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('tuition_events').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — attendance records may exist'); return }
    toast.success('Deleted'); load()
  }

  const toggleActive = async (event: TuitionEvent) => {
    const isNowActive = event.status !== 'active'
    if (isNowActive) {
      await supabase.from('tuition_events').update({ is_active: false, status: 'ended' }).neq('id', event.id)
      await supabase.from('tuition_events').update({ is_active: true, status: 'active' }).eq('id', event.id)
      toast.success('✅ Event set as active!')
    } else {
      await supabase.from('tuition_events').update({ is_active: false, status: 'ended' }).eq('id', event.id)
      toast.success('Event ended')
    }
    load()
  }

  const activeDays = watch('active_days') ?? []
  const bannerPosition = watch('banner_object_position') || 'center center'
  const bannerOverlayStrength = watch('banner_overlay_strength') ?? 70

  const updateClassSlot = (classId: string, patch: Partial<ClassSlotDraft>) => {
    const emptySlot: ClassSlotDraft = {
      capacity: '',
      charge_amount: '',
      charge_frequency: '',
      charge_unit_label: '',
      pricing_note: '',
    }
    setClassSlots((prev) => ({
      ...prev,
      [classId]: { ...emptySlot, ...(prev[classId] || {}), ...patch },
    }))
  }

  const applyClassPricingPreset = (matcher: (classItem: any) => boolean, amount: number, unitLabel = 'per week') => {
    setClassSlots((prev) => {
      const next = { ...prev }
      classes.filter(matcher).forEach((classItem) => {
        const emptySlot: ClassSlotDraft = {
          capacity: '',
          charge_amount: '',
          charge_frequency: '',
          charge_unit_label: '',
          pricing_note: '',
        }
        next[classItem.id] = {
          ...emptySlot,
          ...(next[classItem.id] || {}),
          charge_amount: amount,
          charge_frequency: 'weekly',
          charge_unit_label: unitLabel,
        }
      })
      return next
    })
    toast.success(`Applied KES ${amount.toLocaleString()} ${unitLabel}`)
  }

  const matchesClassPricingGroup = (classItem: any, targets: string[]) => {
    const name = String(classItem.name || '').toLowerCase().replace(/\s+/g, ' ')
    return targets.some((target) => name.includes(target))
  }

  // Compute weeks for view
  const eventWeeks = selectedEvent
    ? getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days, holidays.map(h => h.date))
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Tuition Events</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{events.length} events configured</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => copyShareUrl(`${origin}/#testimonials`)}>
            <MessageSquareQuote size={16} /> Copy Testimonial Link
          </Button>
          <Button onClick={() => { reset(); setClassSlots({}); setEditing(null); setAddOpen(true) }}><Plus size={16} /> New Event</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, i) => (
            (() => {
              const fullUrl = `${origin}/events/register?eventId=${event.id}`
              const shortUrl = `${origin}/events/register?e=${String(event.id).slice(0, 8)}`
              const slotsForEvent = eventSlots.filter((slot) => slot.event_id === event.id && Number(slot.capacity) > 0)
              const totalSlots = slotsForEvent.reduce((sum, slot) => sum + (Number(slot.capacity) || 0), 0)
              return (
            <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="overflow-hidden">
                {getEventPosterUrl(event) ? (
                  <div className="relative h-40 overflow-hidden bg-[var(--input)]">
                    <img src={getEventPosterUrl(event)} alt={`${event.name} banner`} className="h-full w-full object-cover" style={{ objectPosition: event.banner_object_position || 'center center' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <Badge className="absolute bottom-3 left-3" variant={event.status === 'active' ? 'success' : event.status === 'postponed' ? 'warning' : event.status === 'upcoming' ? 'info' : 'muted'}>
                      {event.status === 'active' ? 'Registering now' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/15 via-[var(--card)] to-emerald-500/10">
                    <ImagePlus className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{event.name}</h3>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(event.start_date)} – {formatDate(event.end_date)}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap justify-end">
                    <Badge variant={event.status === 'active' ? 'success' : event.status === 'postponed' ? 'warning' : event.status === 'upcoming' ? 'info' : 'muted'}>
                      {event.status === 'active' ? '● Active' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <button onClick={() => openEdit(event)} className="p-1.5 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}><Edit size={14} /></button>
                    <button
                      onClick={() => loadHolidays(event)}
                      className="p-1.5 rounded-lg"
                      title="Manage Holidays"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                    >
                      <Gift size={14} />
                    </button>
                    <button onClick={() => del(event.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {event.active_days.map((d: string) => (
                    <Badge key={d} variant="info">{d.slice(0, 3).toUpperCase()}</Badge>
                  ))}
                </div>

                <div className="mb-3 rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Charges</div>
                  <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>{formatEventCharge(event)}</div>
                  {event.pricing_note && <p className="mt-1 text-xs text-muted">{event.pricing_note}</p>}
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Location</div>
                    <div className="mt-1 font-black" style={{ color: 'var(--text)' }}>{event.event_location || 'Location not set'}</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Session Time</div>
                    <div className="mt-1 font-black" style={{ color: 'var(--text)' }}>{formatSessionTime(event)}</div>
                  </div>
                </div>

                <div className="mb-3 rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Class Slots</div>
                      <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>
                        {totalSlots > 0 ? `${totalSlots} total places configured` : 'No class slots set'}
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <UsersRound size={18} />
                    </div>
                  </div>
                  {slotsForEvent.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {slotsForEvent.slice(0, 6).map((slot) => {
                        const classItem = classes.find((item) => item.id === slot.class_id)
                        return (
                          <span key={slot.class_id} className="rounded-full bg-[var(--card)] px-2.5 py-1 text-[10px] font-black text-muted">
                            {classItem?.name || 'Class'}: {slot.capacity} place{Number(slot.capacity) === 1 ? '' : 's'} - {formatSlotCharge(slot, event)}
                          </span>
                        )
                      })}
                      {slotsForEvent.length > 6 && (
                        <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-[10px] font-black text-muted">
                          +{slotsForEvent.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Threshold: <strong style={{ color: 'var(--text)' }}>{event.attendance_threshold}%</strong>
                  </span>
                  <Button
                    size="sm"
                    variant={event.status === 'active' ? 'secondary' : 'primary'}
                    onClick={() => toggleActive(event)}
                  >
                    {event.status === 'active' ? 'End Event' : 'Set Active'}
                  </Button>
                </div>
                {origin && (
                  <div className="mt-4 rounded-2xl bg-[var(--input)] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Parent/student share links</p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-xl bg-[var(--card)] p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted">Actual URL</span>
                          <button type="button" onClick={() => copyShareUrl(fullUrl)} className="text-xs font-black text-primary">Copy</button>
                        </div>
                        <input readOnly value={fullUrl} className="w-full bg-transparent text-xs outline-none" style={{ color: 'var(--text)' }} onFocus={(e) => e.currentTarget.select()} />
                      </div>
                      <div className="rounded-xl bg-[var(--card)] p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted">Short version</span>
                          <button type="button" onClick={() => copyShareUrl(shortUrl)} className="text-xs font-black text-primary">Copy</button>
                        </div>
                        <input readOnly value={shortUrl} className="w-full bg-transparent text-xs outline-none" style={{ color: 'var(--text)' }} onFocus={(e) => e.currentTarget.select()} />
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </Card>
            </motion.div>
              )
            })()
          ))}
          {events.length === 0 && (
            <div className="col-span-2 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              No events yet. Create your first tuition event!
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setClassSlots({}); setEditing(null) }} title={editing ? 'Edit Tuition Event' : 'New Tuition Event'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Event Name" placeholder="e.g. April Holiday Tuition" error={errors.name?.message} {...register('name')} />
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
            <label className="mb-2 block text-sm font-bold" style={{ color: 'var(--text)' }}>Poster / Banner</label>
            {watch('banner_url') ? (
              <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={watch('banner_url')}
                    alt="Event banner preview"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: bannerPosition }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" style={{ opacity: Math.max(0, Math.min(95, Number(bannerOverlayStrength))) / 100 }} />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="mb-2 inline-flex rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#073159]">Live card preview</div>
                    <div className="text-xl font-black leading-tight">{watch('name') || 'Holiday Tuition Programme'}</div>
                    <div className="mt-1 text-xs font-bold text-white/75">{watch('event_location') || 'Venue to be confirmed'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] text-sm text-muted">
                Upload a wide poster or paste an image URL.
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input placeholder="https://..." {...register('banner_url')} />
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white">
                <Upload size={15} /> {uploadingBanner ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner} onChange={(e) => uploadBanner(e.target.files?.[0])} />
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
              <Select label="Card Crop Position" {...register('banner_object_position')}>
                <option value="center center">Center</option>
                <option value="center top">Top</option>
                <option value="center bottom">Bottom</option>
                <option value="left center">Left</option>
                <option value="right center">Right</option>
              </Select>
              <Input label="Overlay %" type="number" min={0} max={95} {...register('banner_overlay_strength', { valueAsNumber: true })} />
            </div>
            <p className="mt-2 text-xs text-muted">Recommended: 1600 x 900 poster. Adjust crop position until the important faces/text stay visible on cards.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} />
            <Input label="End Date" type="date" error={errors.end_date?.message} {...register('end_date')} />
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-4">
            <div className="mb-3">
              <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Venue & Session Time</p>
              <p className="text-xs text-muted">Shown on landing cards and the public registration page.</p>
            </div>
            <Input label="Location / Venue" placeholder="Nairobi Campus, Westlands / Online / Hybrid" {...register('event_location')} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" {...register('session_start_time')} />
              <Input label="End Time" type="time" {...register('session_end_time')} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-4">
            <div className="mb-3">
              <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Event Charges</p>
              <p className="text-xs text-muted">Examples: KES 1,250 per week, KES 2,000 per 2 hours, or KES 15,000 full programme.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Amount" type="number" placeholder="1250" {...register('charge_amount', { valueAsNumber: true })} />
              <Select label="Currency" {...register('charge_currency')}>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
              </Select>
              <Select label="Billing Type" {...register('charge_frequency')}>
                <option value="">Select billing type</option>
                <option value="weekly">Weekly</option>
                <option value="per_session">Per session</option>
                <option value="per_2_hours">Per 2 hours</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="per_term">Per term</option>
                <option value="full_programme">Full programme</option>
              </Select>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Public Unit Label" placeholder="per week / per 2 hours / full programme" {...register('charge_unit_label')} />
              <Input label="Pricing Note" placeholder="Sibling discount available, deposit required..." {...register('pricing_note')} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UsersRound size={18} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Class Slots</p>
                <p className="text-xs text-muted">Set available places and class-specific fees. Example: Form 3/Form 4 KES 1,250 weekly, Grade 6-9 KES 1,000 weekly.</p>
              </div>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => applyClassPricingPreset((classItem) => matchesClassPricingGroup(classItem, ['form 3', 'form 4', 'grade 10']), 1250, 'per week')}
                className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-left transition hover:bg-primary/15"
              >
                <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">Apply senior rate</div>
                <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>Form 3, Form 4, Grade 10 - KES 1,250 weekly</div>
              </button>
              <button
                type="button"
                onClick={() => applyClassPricingPreset((classItem) => matchesClassPricingGroup(classItem, ['grade 6', 'grade 7', 'grade 8', 'grade 9']), 1000, 'per week')}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left transition hover:bg-emerald-500/15"
              >
                <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Apply junior CBC rate</div>
                <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>Grade 6-9 - KES 1,000 weekly</div>
              </button>
            </div>
            <div className="space-y-4">
              {curriculums.map((curriculum) => {
                const curriculumClasses = classes.filter((classItem) => classItem.curriculum_id === curriculum.id)
                if (curriculumClasses.length === 0) return null
                return (
                  <div key={curriculum.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-primary">{curriculum.name}</div>
                    <div className="grid gap-3">
                      {curriculumClasses.map((classItem) => (
                        <div key={classItem.id} className="rounded-2xl bg-[var(--input)] p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-black" style={{ color: 'var(--text)' }}>{classItem.name}</span>
                            <div className="flex items-center gap-2 rounded-full bg-[var(--card)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                              <Wallet size={12} /> Class fee
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[0.75fr_1fr_1fr]">
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              placeholder="Slots"
                              value={classSlots[classItem.id]?.capacity ?? ''}
                              onChange={(event) => {
                                const value = event.target.value
                                updateClassSlot(classItem.id, { capacity: value === '' ? '' : Math.max(0, Number(value) || 0) })
                              }}
                              className="h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm font-black outline-none focus:border-primary"
                              style={{ color: 'var(--text)' }}
                            />
                            <input
                              type="number"
                              min={0}
                              inputMode="decimal"
                              placeholder="Amount e.g. 1250"
                              value={classSlots[classItem.id]?.charge_amount ?? ''}
                              onChange={(event) => {
                                const value = event.target.value
                                updateClassSlot(classItem.id, { charge_amount: value === '' ? '' : Math.max(0, Number(value) || 0) })
                              }}
                              className="h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm font-black outline-none focus:border-primary"
                              style={{ color: 'var(--text)' }}
                            />
                            <select
                              value={classSlots[classItem.id]?.charge_frequency ?? ''}
                              onChange={(event) => updateClassSlot(classItem.id, { charge_frequency: event.target.value })}
                              className="h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm font-black outline-none focus:border-primary"
                              style={{ color: 'var(--text)' }}
                            >
                              <option value="">Use event billing</option>
                              <option value="weekly">Weekly</option>
                              <option value="per_session">Per session</option>
                              <option value="per_2_hours">Per 2 hours</option>
                              <option value="daily">Daily</option>
                              <option value="full_programme">Full programme</option>
                            </select>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input
                              placeholder="Public label e.g. per week"
                              value={classSlots[classItem.id]?.charge_unit_label ?? ''}
                              onChange={(event) => updateClassSlot(classItem.id, { charge_unit_label: event.target.value })}
                              className="h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm font-bold outline-none focus:border-primary"
                              style={{ color: 'var(--text)' }}
                            />
                            <input
                              placeholder="Optional note for this class"
                              value={classSlots[classItem.id]?.pricing_note ?? ''}
                              onChange={(event) => updateClassSlot(classItem.id, { pricing_note: event.target.value })}
                              className="h-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 text-sm font-bold outline-none focus:border-primary"
                              style={{ color: 'var(--text)' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {classes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-4 text-sm font-bold text-muted">
                  No classes are configured yet. Add classes first, then return here to set event slots.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Active Days (Mon–Fri recommended)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const current = activeDays
                    if (current.includes(day)) setValue('active_days', current.filter(d => d !== day))
                    else setValue('active_days', [...current, day])
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={{
                    background: activeDays.includes(day) ? 'var(--primary)' : 'var(--input)',
                    color: activeDays.includes(day) ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <Input label="Attendance Threshold (%)" type="number" placeholder="80" error={errors.attendance_threshold?.message} {...register('attendance_threshold', { valueAsNumber: true })} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" error={errors.status?.message} {...register('status')}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="postponed">Postponed</option>
              <option value="cancelled">Cancelled</option>
              <option value="ended">Ended</option>
            </Select>
            {watch('status') === 'postponed' && (
              <Input label="Postponed To Date" type="date" error={errors.postponed_to?.message} {...register('postponed_to')} />
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create Event'}</Button>
          </div>
        </form>
      </Modal>

      {/* Holiday Management Modal */}
      <Modal isOpen={holidayOpen} onClose={() => { setHolidayOpen(false); setSelectedEvent(null) }} title="🎉 Holiday Management" size="lg">
        {selectedEvent && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--input)' }}>
              {(['events', 'weeks'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
                  style={{
                    background: activeTab === tab ? 'var(--card)' : 'transparent',
                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                  }}
                >{tab === 'events' ? '🗓 Holidays' : '📅 Week View'}</button>
              ))}
            </div>

            {activeTab === 'events' && (
              <>
                {/* Add custom holiday */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--input)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Add Custom Holiday</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Holiday name" value={newHoliday.name} onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))} />
                    <Input type="date" value={newHoliday.date} min={selectedEvent.start_date} max={selectedEvent.end_date} onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <Button onClick={addHoliday} size="sm"><Plus size={14} /> Add Holiday</Button>
                </div>

                {/* Holidays list */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Holidays within {selectedEvent.name}
                  </p>
                  {holidays.length === 0 ? (
                    <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                      No holidays found in this date range. The SQL migration seeds Kenyan public holidays — make sure you've run it.
                    </div>
                  ) : holidays.map(h => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--input)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: h.type === 'public' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                          {h.type === 'public' ? '🇰🇪' : '⭐'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{h.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(h.date, 'long')} · {h.type}</div>
                        </div>
                      </div>
                      {h.type === 'custom' && (
                        <button onClick={() => deleteHoliday(h.id, h.type)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'weeks' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Weeks run Mon–Fri. 🎉 indicates a week with holidays.
                </p>
                {eventWeeks.length === 0 ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No weeks calculated yet.</div>
                ) : eventWeeks.map(w => (
                  <div
                    key={w.weekNumber}
                    className="p-4 rounded-xl"
                    style={{ background: w.hasHolidays ? 'rgba(245,158,11,0.08)' : 'var(--input)', border: w.hasHolidays ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{w.label}</div>
                      <Badge variant={w.activeDates.length === 0 ? 'danger' : w.hasHolidays ? 'warning' : 'success'}>
                        {w.activeDates.length} day{w.activeDates.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {w.hasHolidays && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: '#F59E0B' }}>
                        <AlertTriangle size={10} /> Holiday in this week — attendance days reduced
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.activeDates.map(d => (
                        <span key={d} className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                          {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
