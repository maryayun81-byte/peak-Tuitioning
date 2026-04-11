'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Award, BookOpen, X,
  CheckCircle2, TrendingUp, Star, Zap,
  ChevronDown, Medal, Sparkles, Trophy
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'react-hot-toast'

// ── Badge definitions ─────────────────────────────────────────────────────────
const TEACHER_BADGES = [
  {
    type: 'consistent_student',
    label: 'Consistent Student',
    icon: '📝',
    description: 'Always completes and submits assignments on time.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.1)',
    xp: 75,
  },
  {
    type: 'high_achiever',
    label: 'High Achiever',
    icon: '🎯',
    description: 'Consistently scores 80% or above in assignments.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    xp: 100,
  },
  {
    type: 'most_improved',
    label: 'Most Improved',
    icon: '📈',
    description: 'Showed remarkable improvement over recent assessments.',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.1)',
    xp: 90,
  },
  {
    type: 'star_of_the_week',
    label: 'Star of the Week',
    icon: '⭐',
    description: 'Outstanding performance and attitude this week.',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.1)',
    xp: 80,
  },
  {
    type: 'class_champion',
    label: 'Class Champion',
    icon: '🏆',
    description: 'Top performer in the class this term.',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
    xp: 120,
  },
  {
    type: 'effort_award',
    label: 'Effort Award',
    icon: '💪',
    description: 'Exceptional effort and dedication to learning.',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.1)',
    xp: 60,
  },
  {
    type: 'creativity_award',
    label: 'Creativity Award',
    icon: '🎨',
    description: 'Demonstrated outstanding creativity in their work.',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.1)',
    xp: 70,
  },
  {
    type: 'teamwork_star',
    label: 'Teamwork Star',
    icon: '🤝',
    description: 'An excellent collaborator who lifts the whole class.',
    color: '#14B8A6',
    bg: 'rgba(20,184,166,0.1)',
    xp: 65,
  },
]

// ── Award Badge Modal ─────────────────────────────────────────────────────────
function AwardBadgeModal({
  student,
  teacherSubjects,
  teacherId,
  onClose,
  onAwarded,
}: {
  student: any
  teacherSubjects: { subject_id: string; subject_name: string; class_id: string }[]
  teacherId: string
  onClose: () => void
  onAwarded: () => void
}) {
  const supabase = getSupabaseBrowserClient()
  const [selectedBadge, setSelectedBadge] = useState<typeof TEACHER_BADGES[0] | null>(null)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [reason, setReason] = useState('')
  const [awarding, setAwarding] = useState(false)

  // Filter subjects relevant to this student's class
  const relevantSubjects = teacherSubjects.filter(s => s.class_id === student.class_id)

  const handleAward = async () => {
    if (!selectedBadge) return toast.error('Please select a badge')
    setAwarding(true)
    try {
      const subjectEntry = relevantSubjects.find(s => s.subject_id === selectedSubject)
      const { error } = await supabase.rpc('award_student_badge', {
        p_student_id: student.id,
        p_badge_type: selectedBadge.type,
        p_awarded_by_teacher_id: teacherId,
        p_subject_id: subjectEntry?.subject_id || null,
        p_class_id: student.class_id,
        p_reason: reason || selectedBadge.description,
        p_xp_reward: selectedBadge.xp,
      })
      if (error) throw error
      toast.success(`🏅 "${selectedBadge.label}" awarded to ${student.full_name}! +${selectedBadge.xp} XP`)
      onAwarded()
      onClose()
    } catch (err: any) {
      console.error('[AwardBadge]', err)
      toast.error('Failed to award badge. Please try again.')
    } finally {
      setAwarding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      >
        {/* Header */}
        <div className="relative p-6 pb-4" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl" style={{ background: 'white', transform: 'translate(40%, -40%)' }} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-all">
            <X size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl text-white shadow-lg">
              {student.full_name?.[0] ?? '?'}
            </div>
            <div>
              <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Award a Badge</p>
              <h2 className="text-white font-black text-xl leading-tight">{student.full_name}</h2>
              <p className="text-white/60 text-xs">{student.class?.name} · #{student.admission_number}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Badge selection */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Select Badge
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TEACHER_BADGES.map(badge => (
                <button
                  key={badge.type}
                  onClick={() => setSelectedBadge(badge)}
                  className={`relative flex items-start gap-3 p-3 rounded-2xl text-left border transition-all ${
                    selectedBadge?.type === badge.type
                      ? 'ring-2 ring-primary scale-[1.02]'
                      : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    background: selectedBadge?.type === badge.type ? badge.bg : 'var(--input)',
                    borderColor: selectedBadge?.type === badge.type ? badge.color : 'var(--card-border)',
                  }}
                >
                  <span className="text-2xl shrink-0">{badge.icon}</span>
                  <div className="min-w-0">
                    <p className="font-black text-xs leading-tight truncate" style={{ color: 'var(--text)' }}>
                      {badge.label}
                    </p>
                    <p className="text-[9px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {badge.description}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Zap size={9} className="text-amber-500 fill-amber-500" />
                      <span className="text-[9px] font-black text-amber-500">+{badge.xp} XP</span>
                    </div>
                  </div>
                  {selectedBadge?.type === badge.type && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: badge.color }}>
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Subject selection (optional) */}
          {relevantSubjects.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Subject (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSubject('')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    selectedSubject === '' ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/40'
                  }`}
                  style={{ color: selectedSubject === '' ? 'white' : 'var(--text-muted)' }}
                >
                  General / All
                </button>
                {relevantSubjects.map(s => (
                  <button
                    key={s.subject_id}
                    onClick={() => setSelectedSubject(s.subject_id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      selectedSubject === s.subject_id ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/40'
                    }`}
                    style={{ color: selectedSubject === s.subject_id ? 'white' : 'var(--text-muted)' }}
                  >
                    {s.subject_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional personal note */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Personal Note (optional)
            </p>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={selectedBadge?.description || 'Add a personal note for this student…'}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            />
          </div>

          {/* Preview */}
          {selectedBadge && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl flex items-center gap-4 border"
              style={{ background: selectedBadge.bg, borderColor: selectedBadge.color + '40' }}
            >
              <span className="text-4xl">{selectedBadge.icon}</span>
              <div>
                <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{selectedBadge.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {reason || selectedBadge.description}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap size={11} className="text-amber-500 fill-amber-500" />
                  <span className="text-[11px] font-black text-amber-500">+{selectedBadge.xp} XP will be added to {student.full_name.split(' ')[0]}'s profile</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAward}
              disabled={!selectedBadge || awarding}
              className="flex-1 gap-2"
              style={{ background: selectedBadge ? 'linear-gradient(135deg, var(--primary), var(--accent))' : undefined }}
            >
              {awarding ? (
                <><span className="animate-spin">⏳</span> Awarding…</>
              ) : (
                <><Award size={16} /> Award Badge</>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const studentsCache = new Map<string, { data: any[]; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000

export default function TeacherStudents() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<{ subject_id: string; subject_name: string; class_id: string }[]>([])
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [awardingStudent, setAwardingStudent] = useState<any | null>(null)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})

  useEffect(() => { if (teacher) loadAll() }, [teacher?.id])

  const loadAll = async () => {
    if (!teacher?.id) return
    const cached = studentsCache.get(teacher.id)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStudents(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id, subject_id, subject:subjects(name)')
        .eq('teacher_id', teacher.id)

      const classIds = [...new Set((assignments ?? []).map(a => a.class_id))]
      const subjects = (assignments ?? []).map(a => ({
        subject_id: a.subject_id,
        subject_name: (a.subject as any)?.name || 'Unknown',
        class_id: a.class_id,
      }))
      setTeacherSubjects(subjects)

      if (classIds.length === 0) { setStudents([]); setLoading(false); return }

      const { data: studs } = await supabase
        .from('students')
        .select('*, class:classes(name)')
        .in('class_id', classIds)
        .order('full_name')

      const result = studs ?? []
      studentsCache.set(teacher.id, { data: result, ts: Date.now() })
      setStudents(result)

      // Load badge counts for all students
      const studentIds = result.map(s => s.id)
      if (studentIds.length > 0) {
        const { data: badges } = await supabase
          .from('study_badges')
          .select('student_id')
          .eq('awarded_by_teacher_id', teacher.id)
          .in('student_id', studentIds)

        const counts: Record<string, number> = {}
        ;(badges ?? []).forEach(b => {
          counts[b.student_id] = (counts[b.student_id] || 0) + 1
        })
        setBadgeCounts(counts)
      }
    } catch (err) {
      console.error('[TeacherStudents]', err)
    } finally {
      setLoading(false)
    }
  }

  const classes = [...new Map(students.map(s => [s.class_id, s.class?.name])).entries()]
  const filtered = students.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(search.toLowerCase())
    const matchClass = filterClass === 'all' || s.class_id === filterClass
    return matchSearch && matchClass
  })

  return (
    <div className="p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>My Students</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            View, search, and award badges to students in your classes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info" className="px-4 py-2 gap-1.5">
            <Users size={14} /> {students.length} Students
          </Badge>
          <Badge variant="success" className="px-4 py-2 gap-1.5">
            <Award size={14} /> {Object.values(badgeCounts).reduce((a, b) => a + b, 0)} Badges Awarded
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or admission number…"
          leftIcon={<Search size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterClass('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
              filterClass === 'all' ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/40'
            }`}
            style={{ color: filterClass === 'all' ? 'white' : 'var(--text-muted)' }}
          >
            All Classes
          </button>
          {classes.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setFilterClass(id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                filterClass === id ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/40'
              }`}
              style={{ color: filterClass === id ? 'white' : 'var(--text-muted)' }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Student Grid */}
      {loading ? <SkeletonList count={9} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s, i) => {
            const badges = badgeCounts[s.id] || 0
            const initials = s.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-5 relative overflow-hidden group hover:scale-[1.01] transition-all">
                  {/* Ambient glow */}
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-all" style={{ background: 'var(--primary)', transform: 'translate(40%, -40%)' }} />

                  {/* Student header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{s.full_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="muted" className="text-[9px]">{s.class?.name}</Badge>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>#{s.admission_number}</span>
                      </div>
                    </div>
                    {badges > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/10">
                        <Medal size={11} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-500">{badges}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { icon: <Zap size={12} className="text-amber-500 fill-amber-500" />, val: (s.xp || 0).toLocaleString(), label: 'XP' },
                      { icon: <TrendingUp size={12} className="text-emerald-500" />, val: `${s.streak_count || 0}d`, label: 'Streak' },
                      { icon: <Trophy size={12} className="text-violet-500" />, val: badges, label: 'Badges' },
                    ].map(stat => (
                      <div key={stat.label} className="p-2 rounded-xl text-center" style={{ background: 'var(--input)' }}>
                        <div className="flex justify-center mb-0.5">{stat.icon}</div>
                        <div className="font-black text-xs" style={{ color: 'var(--text)' }}>{stat.val}</div>
                        <div className="text-[8px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Award button */}
                  <Button
                    size="sm"
                    className="w-full gap-2 group/btn"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                    onClick={() => setAwardingStudent(s)}
                  >
                    <Award size={14} className="group-hover/btn:scale-110 transition-transform" />
                    Award Badge
                    <Sparkles size={12} className="opacity-70" />
                  </Button>
                </Card>
              </motion.div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto opacity-30" style={{ background: 'var(--input)' }}>
                <Users size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students found in your assigned classes.</p>
            </div>
          )}
        </div>
      )}

      {/* Award Modal */}
      <AnimatePresence>
        {awardingStudent && (
          <AwardBadgeModal
            student={awardingStudent}
            teacherSubjects={teacherSubjects}
            teacherId={teacher?.id || ''}
            onClose={() => setAwardingStudent(null)}
            onAwarded={() => {
              setBadgeCounts(prev => ({
                ...prev,
                [awardingStudent.id]: (prev[awardingStudent.id] || 0) + 1,
              }))
              studentsCache.delete(teacher?.id || '')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
