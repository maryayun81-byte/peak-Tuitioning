'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, MapPin, CheckCircle, GraduationCap, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function TuitionNairobi() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-white">
      {/* Hero */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-500/10 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 mb-8 hover:text-emerald-300 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight uppercase tracking-tighter">
            Premier Tutoring Center <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">in Nairobi</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-2xl mx-auto">
            Looking for a reliable tutoring center in Nairobi? Peak Performance Tutoring offers KCSE and CBC tuition, holiday revision programs, and subject-focused learning to help students improve performance and confidence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="rounded-2xl px-10 bg-emerald-500 hover:bg-emerald-600">
               Enroll Now
            </Button>
            <Button variant="outline" size="lg" className="rounded-2xl px-10 border-white/10 bg-white/5">
               View Programs
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <section className="py-24 px-6 relative">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase flex items-center gap-3">
                     <MapPin className="text-emerald-500" /> Education in Nairobi
                  </h2>
                  <div className="h-1 w-20 bg-emerald-500 rounded-full" />
               </div>
               <p className="text-white/70 leading-relaxed">
                  In the heart of Nairobi, we provide a structured environment where students can tackle the challenging Kenyan curriculum. Our center is equipped with modern tools and led by experienced educators who understand the local academic landscape.
               </p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "Holiday Tuition Nairobi",
                    "Secondary School Tuition",
                    "CBC Support Classes",
                    "KCSE Intensive Revision"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                       <CheckCircle size={16} className="text-emerald-400" />
                       <span className="text-sm font-bold opacity-80">{item}</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="relative">
               <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
               <div className="relative lg:aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  <img 
                    src="/media__1776584038977.jpg" 
                    alt="Students in Nairobi classroom" 
                    className="w-full h-full object-cover"
                  />
               </div>
            </div>
         </div>
      </section>

      {/* SEO Optimized Footer Text */}
      <section className="py-20 px-6 bg-white/5 border-t border-white/10">
         <div className="max-w-4xl mx-auto text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Trusted Academic Support</p>
            <h3 className="text-2xl font-bold">Why Peak Performance Tutoring?</h3>
            <p className="text-white/60 text-sm leading-relaxed">
               As a premier tutoring center in Nairobi, we specialize in helping students from various secondary schools across Kenya. Our holiday tuition programs and weekly classes are designed to bridge the gap between classroom learning and exam excellence. Whether you need Math tuition in Nairobi or Biology revision for KCSE, we have the right program for you.
            </p>
         </div>
      </section>
    </main>
  )
}
