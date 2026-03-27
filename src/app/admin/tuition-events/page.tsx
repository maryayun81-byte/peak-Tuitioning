'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, CheckCircle, Gift, X, AlertTriangle } from 'lucide-react'
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

interface Holiday {
  id: string
  name: string
  date: string
  type: 'public' | 'custom'
}

const schema = z.object({
  name: z.string().min(2),
  start_date: z.string(),
  end_date: z.string(),
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
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<TuitionEvent | null>(null)
  const [holidayOpen, setHolidayOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<TuitionEvent | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' })
  const [activeTab, setActiveTab] = useState<'events' | 'weeks'>('events')

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      active_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      attendance_threshold: 80,
      status: 'upcoming',
      postponed_to: '',
    },
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, cRes] = await Promise.all([
        supabase.from('tuition_events').select('*, curriculum:curriculums(name)').order('start_date', { ascending: false }),
        supabase.from('curriculums').select('*').order('name'),
      ])
      setEvents(tRes.data ?? [])
      setCurriculums(cRes.data ?? [])
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
    setValue('attendance_threshold', e.attendance_threshold)
    setValue('status', e.status || 'upcoming')
    setValue('postponed_to', e.postponed_to || '')
    setAddOpen(true)
  }

  const onSubmit = async (data: any) => {
    // Keep is_active boolean synced for legacy queries
    data.is_active = data.status === 'active';
    if (!data.postponed_to) data.postponed_to = null;

    if (data.status === 'active') {
      await supabase.from('tuition_events').update({ is_active: false, status: 'ended' }).neq('id', editing?.id ?? '')
    }

    const { error } = editing
      ? await supabase.from('tuition_events').update(data).eq('id', editing.id)
      : await supabase.from('tuition_events').insert(data)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Event updated!' : 'Event created successfully!')
    reset(); setEditing(null); setAddOpen(false); load()
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
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> New Event</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5">
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
              </Card>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-2 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              No events yet. Create your first tuition event!
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Tuition Event' : 'New Tuition Event'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Event Name" placeholder="e.g. April Holiday Tuition" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} />
            <Input label="End Date" type="date" error={errors.end_date?.message} {...register('end_date')} />
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
