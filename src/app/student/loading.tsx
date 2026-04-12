import { SkeletonDashboard } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8 animate-pulse">
         <div className="w-12 h-12 bg-white/5 rounded-2xl" />
         <div>
            <div className="h-5 w-48 bg-white/5 rounded-lg mb-2" />
            <div className="h-3 w-32 bg-white/5 rounded-md" />
         </div>
      </div>
      <SkeletonDashboard />
    </div>
  )
}
