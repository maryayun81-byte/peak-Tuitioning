'use client'

import { cn } from '@/lib/utils'

interface ShimmerSkeletonProps {
  className?: string
  variant?: 'rectangular' | 'circular' | 'text' | 'card'
}

export function ShimmerSkeleton({ className, variant = 'rectangular' }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[var(--input)]/50 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        variant === 'circular' && "rounded-full",
        variant === 'rectangular' && "rounded-2xl",
        variant === 'text' && "rounded h-4 w-full",
        variant === 'card' && "rounded-[2rem] h-32",
        className
      )}
    />
  )
}

export function TriviaSkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 rounded-[2rem] border-2 border-[var(--card-border)] bg-[var(--card)]/50 space-y-4">
          <div className="flex gap-4">
            <ShimmerSkeleton className="w-16 h-16 rounded-[1.5rem]" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="w-3/4 h-6" variant="text" />
              <ShimmerSkeleton className="w-1/2 h-3" variant="text" />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
             <ShimmerSkeleton className="w-20 h-4" variant="text" />
             <ShimmerSkeleton className="w-20 h-4" variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}
