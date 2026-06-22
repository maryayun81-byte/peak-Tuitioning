'use client'

import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function StudentNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <SearchX size={36} className="text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Page Not Found</h1>
        <p className="text-slate-500 font-medium">
          This page doesn't exist or you may not have access to it.
        </p>
        <Link
          href="/student/resources"
          className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
        >
          <ArrowLeft size={18} /> Back to Resources
        </Link>
      </div>
    </div>
  )
}
