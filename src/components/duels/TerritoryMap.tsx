'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Castle, Crown, Flag, Info, MapPin, Route, Shield, Swords } from 'lucide-react'
import { HOUSES, type HouseId } from '@/types/houses'
import { getTerritoryMap } from '@/app/actions/houses'

interface TerritoryData {
  id: string
  name: string
  owner: HouseId
  points: number
  threshold: number
  adjacent: string[]
}

type TerritoryKind = 'capital' | 'fortress' | 'port' | 'academy' | 'wilds' | 'resource'

const REALM_META: Record<string, {
  realmName: string
  kind: TerritoryKind
  terrain: string
  value: string
  x: number
  y: number
  polygon: string
}> = {
  highlands: {
    realmName: 'Summit Crownlands',
    kind: 'capital',
    terrain: 'Snow peaks and royal observatories',
    value: 'Controls the northern pass',
    x: 19,
    y: 12,
    polygon: '8,4 26,6 31,19 21,31 7,25 3,13',
  },
  lowlands: {
    realmName: 'Amber Grainfields',
    kind: 'resource',
    terrain: 'Fertile learning estates',
    value: 'Generates steady house points',
    x: 30,
    y: 28,
    polygon: '25,10 43,15 45,32 31,42 18,31 21,18',
  },
  coast: {
    realmName: 'Pearl Coast',
    kind: 'port',
    terrain: 'Trade harbours and revision docks',
    value: 'Gateway to island raids',
    x: 13,
    y: 39,
    polygon: '3,27 19,32 22,49 12,64 2,56 0,40',
  },
  forest: {
    realmName: 'Verdant Commons',
    kind: 'wilds',
    terrain: 'Forests, rivers and hidden study camps',
    value: 'Defensive buffer territory',
    x: 31,
    y: 51,
    polygon: '21,38 38,42 43,58 31,70 17,61 13,47',
  },
  desert: {
    realmName: 'Sunforge Barrens',
    kind: 'resource',
    terrain: 'Salt flats and metal forges',
    value: 'Boosts boss battle campaigns',
    x: 50,
    y: 20,
    polygon: '43,7 61,10 66,24 55,36 43,31 39,17',
  },
  valley: {
    realmName: 'Scholar Valley',
    kind: 'academy',
    terrain: 'Libraries and debate courts',
    value: 'Training ground for comeback wins',
    x: 52,
    y: 43,
    polygon: '43,32 59,36 63,52 51,64 39,56 38,42',
  },
  mountains: {
    realmName: 'Ironspine Range',
    kind: 'fortress',
    terrain: 'Cliff citadels and stone gates',
    value: 'Hard to capture, high prestige',
    x: 70,
    y: 20,
    polygon: '62,7 80,9 86,23 78,35 63,32 58,18',
  },
  peaks: {
    realmName: 'Apex Watch',
    kind: 'fortress',
    terrain: 'Signal towers above the clouds',
    value: 'Reveals adjacent conquest routes',
    x: 76,
    y: 39,
    polygon: '62,32 80,34 88,47 78,60 63,53 59,40',
  },
  city: {
    realmName: 'The Grand Athenaeum',
    kind: 'capital',
    terrain: 'Central city of champions',
    value: 'Season-defining prestige territory',
    x: 62,
    y: 61,
    polygon: '47,58 64,52 79,62 74,78 56,82 45,70',
  },
  tundra: {
    realmName: 'Frostline March',
    kind: 'wilds',
    terrain: 'Cold frontier and endurance trials',
    value: 'Rewards long streaks',
    x: 91,
    y: 17,
    polygon: '82,4 98,8 100,26 88,37 78,27 78,11',
  },
  delta: {
    realmName: 'Blue Delta',
    kind: 'port',
    terrain: 'River gates and strategy canals',
    value: 'Connects inland and coast campaigns',
    x: 91,
    y: 47,
    polygon: '81,34 99,29 100,50 91,65 78,58 78,45',
  },
  plains: {
    realmName: 'Golden Plains',
    kind: 'resource',
    terrain: 'Open contest fields',
    value: 'Fastest territory to flip',
    x: 79,
    y: 72,
    polygon: '72,65 91,65 98,81 85,94 68,87 64,75',
  },
  harbor: {
    realmName: 'Stormglass Harbor',
    kind: 'port',
    terrain: 'Deep-water fleet academy',
    value: 'Launches island campaigns',
    x: 55,
    y: 86,
    polygon: '47,77 64,80 68,95 54,100 42,91 40,82',
  },
  ridge: {
    realmName: 'Obsidian Ridge',
    kind: 'fortress',
    terrain: 'Black rock bastions',
    value: 'Protects the western road',
    x: 35,
    y: 78,
    polygon: '25,68 43,69 45,86 32,98 18,89 16,75',
  },
  islands: {
    realmName: 'Oracle Isles',
    kind: 'academy',
    terrain: 'Islands of riddles and boss trials',
    value: 'Rare badge territory',
    x: 20,
    y: 83,
    polygon: '5,66 19,64 26,78 21,95 7,98 0,83',
  },
  capital: {
    realmName: 'Crown Citadel',
    kind: 'capital',
    terrain: 'The realm throne and final banner',
    value: 'Highest symbolic control',
    x: 60,
    y: 48,
    polygon: '53,39 66,40 72,51 65,62 51,60 46,49',
  },
}

function getKindIcon(kind: TerritoryKind) {
  if (kind === 'capital') return <Crown size={13} />
  if (kind === 'fortress') return <Castle size={13} />
  if (kind === 'port') return <Flag size={13} />
  if (kind === 'academy') return <Shield size={13} />
  if (kind === 'resource') return <MapPin size={13} />
  return <Swords size={13} />
}

export function TerritoryMap() {
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTerritoryMap().then(data => {
      setTerritories(data as any)
      setSelected((data as any)?.[0]?.id || null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-purple-500" />
      </div>
    )
  }

  const selectedTerr = territories.find(t => t.id === selected)
  const leadingHouse = territories.reduce<Record<string, number>>((acc, territory) => {
    acc[territory.owner] = (acc[territory.owner] || 0) + 1
    return acc
  }, {})
  const dominantHouse = HOUSES.find(h => h.id === Object.entries(leadingHouse).sort((a, b) => b[1] - a[1])[0]?.[0])

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border bg-[#101827]"
          style={{ borderColor: 'var(--card-border)' }}>
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">Territory Wars</div>
            <div className="text-sm font-black text-white">The Peak Realms</div>
            <div className="text-[10px] text-slate-400">{dominantHouse?.name || 'No house'} controls the most land</div>
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs>
              <filter id="realmShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#020617" floodOpacity="0.55" />
              </filter>
            </defs>
            {territories.map(t => {
              const meta = REALM_META[t.id]
              if (!meta) return null
              return t.adjacent.map(adj => {
                const target = REALM_META[adj]
                if (!target || t.id > adj) return null
                return (
                  <line
                    key={`${t.id}-${adj}`}
                    x1={meta.x}
                    y1={meta.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(226,232,240,0.24)"
                    strokeWidth="0.35"
                    strokeDasharray="1.2 1.1"
                  />
                )
              })
            })}
            {territories.map(t => {
              const meta = REALM_META[t.id]
              const house = HOUSES.find(h => h.id === t.owner)
              if (!meta || !house) return null
              const isSelected = selected === t.id
              return (
                <polygon
                  key={t.id}
                  points={meta.polygon}
                  filter="url(#realmShadow)"
                  fill={isSelected ? `${house.color}55` : `${house.color}2f`}
                  stroke={isSelected ? house.color : `${house.color}aa`}
                  strokeWidth={isSelected ? 0.85 : 0.45}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelected(t.id)}
                />
              )
            })}
          </svg>

          {territories.map((t, index) => {
            const meta = REALM_META[t.id]
            const house = HOUSES.find(h => h.id === t.owner)
            if (!meta || !house) return null
            const isSelected = selected === t.id
            const progress = Math.min((t.points || 0) / (t.threshold || 100), 1)
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                onClick={() => setSelected(t.id)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left"
                style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex min-w-[92px] items-center gap-1.5 rounded-xl border px-2 py-1.5 shadow-lg backdrop-blur"
                  style={{
                    background: isSelected ? 'rgba(15,23,42,0.92)' : 'rgba(15,23,42,0.72)',
                    borderColor: isSelected ? house.color : 'rgba(255,255,255,0.12)',
                  }}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
                    style={{ background: house.color }}>
                    {getKindIcon(meta.kind)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[9px] font-black uppercase tracking-wide text-white">{meta.realmName}</span>
                    <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full" style={{ width: `${progress * 100}%`, background: house.color }} />
                    </span>
                  </span>
                </div>
              </motion.button>
            )
          })}

          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap gap-2">
            {HOUSES.map(h => (
              <div key={h.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2 py-1 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: h.color }} />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">{h.name}</span>
              </div>
            ))}
          </div>
        </div>

        <AnimatedInfo selected={selectedTerr} />
      </div>
    </div>
  )
}

function AnimatedInfo({ selected }: { selected: TerritoryData | undefined }) {
  return (
    <AnimatePresence mode="wait">
      {selected && <TerritoryPanel key={selected.id} selected={selected} />}
    </AnimatePresence>
  )
}

function TerritoryPanel({ selected }: { selected: TerritoryData }) {
  const house = HOUSES.find(h => h.id === selected.owner)
  const meta = REALM_META[selected.id]
  const progress = Math.min(selected.points / selected.threshold, 1)
  const routeCount = selected.adjacent?.length || 0

  if (!house || !meta) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="rounded-2xl border p-4"
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: house.color }}>
            {getKindIcon(meta.kind)} {meta.kind}
          </div>
          <h3 className="mt-1 text-lg font-black leading-tight" style={{ color: 'var(--text)' }}>{meta.realmName}</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{meta.terrain}</p>
        </div>
        <div className="rounded-xl px-2.5 py-2 text-center" style={{ background: house.bg }}>
          <div className="text-lg">{house.emoji}</div>
          <div className="text-[8px] font-black uppercase" style={{ color: house.color }}>{house.name}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Control', value: `${Math.round(progress * 100)}%`, icon: <Shield size={13} /> },
          { label: 'Routes', value: routeCount, icon: <Route size={13} /> },
          { label: 'Points', value: selected.points, icon: <Swords size={13} /> },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-2 text-center" style={{ background: 'var(--input)' }}>
            <div className="mx-auto mb-1 flex justify-center" style={{ color: house.color }}>{item.icon}</div>
            <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{item.value}</div>
            <div className="text-[8px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
          <span style={{ color: 'var(--text-muted)' }}>Campaign progress</span>
          <span style={{ color: house.color }}>{selected.points}/{selected.threshold}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--input)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className="h-full"
            style={{ background: house.color }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: house.bg }}>
        <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: house.color }}>
          <Info size={12} /> Strategic Value
        </div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{meta.value}</p>
      </div>
    </motion.div>
  )
}
