'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onNext: () => void
  onPrev: () => void
  hasNext: boolean
  hasPrev: boolean
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  onNext, 
  onPrev, 
  hasNext, 
  hasPrev 
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onPrev} 
        disabled={!hasPrev}
        className="rounded-xl h-10 w-10 p-0"
      >
        <ChevronLeft size={18} />
      </Button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
          // Simple logic for first 5 pages, can be improved for many pages
          const pageNum = i + 1
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={`rounded-xl h-10 w-10 p-0 font-bold text-xs ${currentPage === pageNum ? 'shadow-lg shadow-primary/25' : ''}`}
            >
              {pageNum}
            </Button>
          )
        })}
        {totalPages > 5 && <span className="text-muted text-xs px-2">...</span>}
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onNext} 
        disabled={!hasNext}
        className="rounded-xl h-10 w-10 p-0"
      >
        <ChevronRight size={18} />
      </Button>
      
      <div className="ml-4 text-[10px] font-black uppercase tracking-widest text-muted">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  )
}
