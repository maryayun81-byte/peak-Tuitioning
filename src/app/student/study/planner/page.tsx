'use client'

import { StudyPlanner } from '@/components/student/study/StudyPlanner'
import { useRouter } from 'next/navigation'

export default function StudentPlannerPage() {
  const router = useRouter()
  return (
    <div className="p-6">
      <StudyPlanner onComplete={() => router.push('/student/study')} />
    </div>
  )
}
