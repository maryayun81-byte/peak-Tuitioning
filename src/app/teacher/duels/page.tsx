'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Swords, Trophy, Medal, Users, TrendingUp, Zap, Target, Crown, BarChart3, Eye } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import type { Duel, DuelLeaderboardEntry, WeeklyChampionship } from '@/types/duels'
import { getDuelLeaderboard, getActiveDuels, createTeacherChallenge, getActiveWeeklyChampionship } from '@/app/actions/duels'

export default function TeacherDuelsPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile } = useAuthStore()
  const [duels, setDuels] = useState<Duel[]>([])
  const [leaderboard, setLeaderboard] = useState<DuelLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'challenges' | 'spectate'>('overview')

  useEffect(() => {
    Promise.all([
      getActiveDuels(),
      getDuelLeaderboard(20),
    ]).then(([d, l]) => {
      setDuels(d)
      setLeaderboard(l)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords size={20} style={{ color: 'var(--primary)' }} />
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--text)' }}>Class Duels</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Monitor and manage student duels</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={14} /> },
          { id: 'challenges' as const, label: 'Create Challenge', icon: <Target size={14} /> },
          { id: 'spectate' as const, label: 'Live Duels', icon: <Eye size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${tab === t.id ? 'bg-primary text-white' : ''}`}
            style={{ background: tab === t.id ? 'var(--primary)' : 'var(--input)', color: tab === t.id ? 'white' : 'var(--text-muted)' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Duels', value: duels.filter(d => d.status === 'active').length, icon: <Zap size={18} />, color: '#10B981' },
              { label: 'Waiting', value: duels.filter(d => d.status === 'waiting').length, icon: <Users size={18} />, color: '#F59E0B' },
              { label: 'Total Players', value: duels.reduce((s, d) => s + (d.participants?.length || 0), 0), icon: <Users size={18} />, color: '#3B82F6' },
              { label: 'Top Rating', value: leaderboard[0]?.duel_rating || 0, icon: <Crown size={18} />, color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}</div>
                <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{s.value}</div>
                <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top players */}
          <div>
            <h3 className="text-sm font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Medal size={16} style={{ color: '#F59E0B' }} /> Top Duelists
            </h3>
            <div className="space-y-1">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <motion.div
                  key={entry.student_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--input)' }}
                >
                  <span className="w-6 text-center text-xs font-black" style={{ color: i < 3 ? '#F59E0B' : 'var(--text-muted)' }}>
                    {['🥇', '🥈', '🥉'][i] || `#${i + 1}`}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                    {entry.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{entry.full_name}</div>
                    <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{entry.class_name || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{entry.duel_rating}</div>
                    <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{entry.win_rate}% WR</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'challenges' && (
        <CreateChallengeForm />
      )}

      {tab === 'spectate' && (
        <div className="p-6 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Eye size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Live Spectator View</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {duels.filter(d => d.status === 'active').length > 0
              ? `${duels.filter(d => d.status === 'active').length} active duels available to spectate`
              : 'No active duels right now'}
          </p>
        </div>
      )}
    </div>
  )
}

function CreateChallengeForm() {
  const [title, setTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState(15)
  const [rewardXp, setRewardXp] = useState(100)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return toast.error('Enter a challenge title')
    setSaving(true)
    try {
      await createTeacherChallenge({
        title: title.trim(),
        class_id: '',
        time_limit: timeLimit,
        reward_xp: rewardXp,
      })
      toast.success('Challenge created!')
      setTitle('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Create Teacher Challenge</h3>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Challenge title..."
        className="w-full px-4 py-2.5 rounded-xl text-sm border"
        style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Time Limit (seconds)
          </label>
          <input
            type="number"
            value={timeLimit}
            onChange={e => setTimeLimit(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Reward XP
          </label>
          <input
            type="number"
            value={rewardXp}
            onChange={e => setRewardXp(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm border"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
        </div>
      </div>
      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
        style={{ background: 'var(--primary)', color: 'white', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Creating...' : 'Post Challenge'}
      </button>
    </div>
  )
}
