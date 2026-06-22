'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

// Dynamically import the interactive engines
import IronExtraction from '@/app/teacher/resources/chemistry/extraction/iron/page'
import ReactivitySeriesTree from '@/app/teacher/resources/chemistry/extraction/reactivity/page'
import ZincLeadExtraction from '@/app/teacher/resources/chemistry/extraction/zinc-lead/page'
import BondingExplorer from '@/app/teacher/resources/chemistry/structure-bonding/bonding/page'
import StructureComparisonTable from '@/app/teacher/resources/chemistry/structure-bonding/comparison/page'
import ExaminerTrapsPack from '@/app/teacher/resources/chemistry/structure-bonding/traps/page'
import TopicRecoveryPack from '@/app/teacher/resources/chemistry/structure-bonding/recovery/page'

function ViewerContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading || !resource) {
    return <SkeletonDashboard />
  }

  const title = (resource.title || '').toLowerCase()

  // Routing to the correct Interactive Engine based on title
  // We use this pattern since the prototype uses predefined React components
  const renderEngine = () => {
    if (title.includes('iron') || title.includes('blast furnace')) {
      return <IronExtraction />
    }
    if (title.includes('reactivity')) {
      return <ReactivitySeriesTree />
    }
    if (title.includes('zinc') || title.includes('lead')) {
      return <ZincLeadExtraction />
    }
    if (title.includes('bonding')) {
      return <BondingExplorer />
    }
    if (title.includes('comparison') || title.includes('structure')) {
      return <StructureComparisonTable />
    }
    if (title.includes('trap')) {
      return <ExaminerTrapsPack />
    }
    if (title.includes('recovery')) {
      return <TopicRecoveryPack />
    }

    // Fallback if not an interactive engine
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)' }}>
        <h2 className="text-2xl font-black mb-4" style={{ color: 'var(--text)' }}>Standard Resource</h2>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">This resource uses standard text or external links and doesn't have an interactive engine attached.</p>
        <Link href="/student/resources">
          <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all">
            Return to Library
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      {renderEngine()}
    </div>
  )
}

export default function StudentResourceViewer() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <ViewerContent />
    </Suspense>
  )
}
