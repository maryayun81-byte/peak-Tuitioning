'use client'

import { useEffect, useState, Suspense, type ComponentType } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import Link from 'next/link'

// ─── Chemistry Engine Registry ───────────────────────────────────────────────
// Each entry: keywords to match against the resource title, and a function
// that returns the default-imported page component.
// Engines with ambiguous titles are disambiguated by checking the chapter field.

interface EngineEntry {
  keywords: string[]
  page: () => Promise<{ default: React.ComponentType<any> }>
  chapter?: string
}

const engineRegistry: EngineEntry[] = [
  // ── Concept Engine ────────────────────────────────────────────────────────
  {
    keywords: ['electrolysis', 'molten nacl', 'electrochem'],
    page: () => import('@/app/teacher/resources/chemistry/concept-engine/electrochemistry/page')
  },
  {
    keywords: ['combustion', 'methane', 'combustion of methane'],
    page: () => import('@/app/teacher/resources/chemistry/concept-engine/enthalpy/page')
  },
  {
    keywords: ['solvay', 'solvay process', 'industrial'],
    page: () => import('@/app/teacher/resources/chemistry/concept-engine/industrial/page')
  },
  {
    keywords: ['alkene', 'alcohol', 'alkenes to alcohols', 'organic'],
    page: () => import('@/app/teacher/resources/chemistry/concept-engine/organic/page')
  },
  {
    keywords: ['chemical bonding', 'types of bonding', 'bonding type'],
    page: () => import('@/app/teacher/resources/chemistry/concept-engine/structure/page')
  },

  // ── Extraction ────────────────────────────────────────────────────────────
  {
    keywords: ['iron', 'blast furnace'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/iron/page')
  },
  {
    keywords: ['reactivity series', 'reactivity tree', 'reactivity'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/reactivity/page')
  },
  {
    keywords: ['zinc', 'lead', 'zinc & lead'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/zinc-lead/page')
  },
  {
    keywords: ['aluminium', 'hall', 'hall-héroult', 'hall heroult'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/aluminium/page')
  },
  {
    keywords: ['copper', 'smelting', 'copper extraction'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/copper/page')
  },
  {
    keywords: ['sodium', 'downs cell', 'downs'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/sodium/page')
  },
  {
    keywords: ['ore concentration', 'froth flotation', 'concentration'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/concentration/page')
  },
  {
    keywords: ['comparison table', 'master comparison', 'extraction comparison'],
    page: () => import('@/app/teacher/resources/chemistry/extraction/comparison/page')
  },

  // ── Structure & Bonding ───────────────────────────────────────────────────
  {
    keywords: ['bonding explorer', 'bonding'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/bonding/page')
  },
  {
    keywords: ['structure comparison', 'comparison'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/comparison/page')
  },
  {
    keywords: ['property explorer', 'properties'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/properties/page')
  },
  {
    keywords: ['structure explorer', 'structure'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/structure/page')
  },
  {
    keywords: ['recovery', 'topic recovery', 'structure recovery', 'bonding recovery'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/recovery/page'),
    chapter: 'structure-bonding'
  },
  {
    keywords: ['trap', 'examiner trap', 'structure trap', 'bonding trap'],
    page: () => import('@/app/teacher/resources/chemistry/structure-bonding/traps/page'),
    chapter: 'structure-bonding'
  },

  // ── Enthalpy ──────────────────────────────────────────────────────────────
  {
    keywords: ['calorimetry', 'calculations', 'calorimetry & calculations'],
    page: () => import('@/app/teacher/resources/chemistry/enthalpy/calculations/page')
  },
  {
    keywords: ['energy diagram', 'diagrams visualizer', 'energy diagrams'],
    page: () => import('@/app/teacher/resources/chemistry/enthalpy/diagrams/page')
  },
  {
    keywords: ['hess', 'hess law', 'hess\'s law', 'cycles builder'],
    page: () => import('@/app/teacher/resources/chemistry/enthalpy/hess/page')
  },
  {
    keywords: ['recovery', 'topic recovery', 'enthalpy recovery'],
    page: () => import('@/app/teacher/resources/chemistry/enthalpy/recovery/page'),
    chapter: 'enthalpy'
  },
  {
    keywords: ['trap', 'examiner trap', 'enthalpy trap'],
    page: () => import('@/app/teacher/resources/chemistry/enthalpy/traps/page'),
    chapter: 'enthalpy'
  },

  // ── Periodic Table ────────────────────────────────────────────────────────
  {
    keywords: ['chemical families', 'families'],
    page: () => import('@/app/teacher/resources/chemistry/periodic-table/families/page')
  },
  {
    keywords: ['periodic trends', 'trends', 'periodic trends engine'],
    page: () => import('@/app/teacher/resources/chemistry/periodic-table/trends/page')
  },
  {
    keywords: ['recovery', 'topic recovery', 'periodic recovery'],
    page: () => import('@/app/teacher/resources/chemistry/periodic-table/recovery/page'),
    chapter: 'periodic-table'
  },
  {
    keywords: ['trap', 'examiner trap', 'periodic trap'],
    page: () => import('@/app/teacher/resources/chemistry/periodic-table/traps/page'),
    chapter: 'periodic-table'
  },

  // ── Root-level Engines ────────────────────────────────────────────────────
  {
    keywords: ['conditions', 'conditions handbook'],
    page: () => import('@/app/teacher/resources/chemistry/conditions/page')
  },
  {
    keywords: ['reaction map', 'reaction-map'],
    page: () => import('@/app/teacher/resources/chemistry/reaction-map/page')
  },
  {
    keywords: ['practical', 'practical pack'],
    page: () => import('@/app/teacher/resources/chemistry/practical/page')
  },
]

function ViewerContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [EngineComponent, setEngineComponent] = useState<ComponentType<any> | null>(null)
  const [matchFailed, setMatchFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchResource = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.from('resources').select('*').eq('id', id).single()
      setResource(data)
      setLoading(false)
    }
    fetchResource()
  }, [id])

  useEffect(() => {
    if (!resource) return
    let cancelled = false

    const title = (resource.title || '').toLowerCase()
    const chapter = (resource.chapter || '').toLowerCase()

    for (const entry of engineRegistry) {
      const keywordMatch = entry.keywords.some(kw => title.includes(kw))
      if (!keywordMatch) continue

      if (entry.chapter && !chapter.includes(entry.chapter)) continue

      entry.page().then(mod => {
        if (!cancelled) setEngineComponent(mod.default)
      })
      return
    }

    if (!cancelled) setMatchFailed(true)

    return () => { cancelled = true }
  }, [resource])

  if (loading || !resource) {
    return <SkeletonDashboard />
  }

  if (EngineComponent) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <EngineComponent />
      </div>
    )
  }

  if (matchFailed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)' }}>
        <h2 className="text-2xl font-black mb-4" style={{ color: 'var(--text)' }}>Standard Resource</h2>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">This resource uses standard text or external links and doesn&apos;t have an interactive engine attached.</p>
        <Link href="/student/resources">
          <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all">
            Return to Library
          </button>
        </Link>
      </div>
    )
  }

  return <SkeletonDashboard />
}

export default function StudentResourceViewer() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <ViewerContent />
    </Suspense>
  )
}
