'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, BookOpen, GraduationCap, CheckCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function KCSECBCTutoring() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-white">
      {/* Hero */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-blue-500/10 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-8 hover:text-blue-300 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight uppercase tracking-tighter">
            KCSE & CBC <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Tutoring in Kenya</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-2xl mx-auto">
            We provide comprehensive KCSE and CBC tutoring in Kenya, covering Mathematics, English, Kiswahili, Biology, Chemistry, and Physics. Our programs are designed to support both secondary school students and CBC learners at different levels.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="rounded-2xl px-10 bg-blue-600 hover:bg-blue-700">
               Get Started
            </Button>
            <Link href="/auth/login?role=student">
              <Button variant="outline" size="lg" className="rounded-2xl px-10 border-white/10 bg-white/5">
                Join Student Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Curriculum Comparison Section */}
      <section className="py-24 px-6">
         <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                     <BookOpen size={28} className="text-white" />
                  </div>
                  <h3 className="text-3xl font-black uppercase mb-4 tracking-tight">KCSE Excellence</h3>
                  <p className="text-white/60 leading-relaxed mb-8">
                     Intensive revision for 8-4-4 system students focusing on examination techniques, past papers, and conceptual mastery in all secondary school subjects.
                  </p>
                  <ul className="space-y-4">
                     {["Biology Revision KCSE", "Physics Practical Prep", "Kiswahili Setbook Analysis", "Advanced Math Modules"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 font-bold text-sm">
                           <Star size={14} className="text-blue-400 fill-blue-400/20" /> {item}
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                     <GraduationCap size={28} className="text-white" />
                  </div>
                  <h3 className="text-3xl font-black uppercase mb-4 tracking-tight">CBC Mastery</h3>
                  <p className="text-white/60 leading-relaxed mb-8">
                     Competency Based Curriculum support designed to nurture talents and practical understanding for the modern Kenyan secondary school learner.
                  </p>
                  <ul className="space-y-4">
                     {["Creative Arts & ICT", "Practical Sciences", "Social Studies Mastery", "Literacy & Numeracy"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 font-bold text-sm">
                           <Star size={14} className="text-indigo-400 fill-indigo-400/20" /> {item}
                        </li>
                     ))}
                  </ul>
               </div>
            </div>
         </div>
      </section>

      {/* Featured Gallery Image */}
      <section className="pb-24 px-6">
         <div className="max-w-7xl mx-auto">
            <div className="relative rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
               <img src="/media__1776583980277.jpg" alt="Tutoring sessions in Kenya" className="w-full h-[500px] object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] to-transparent opacity-60" />
               <div className="absolute bottom-12 left-12 right-12">
                  <h4 className="text-3xl font-black uppercase tracking-tight mb-2">Modern Learning Tools</h4>
                  <p className="text-white/70 max-w-xl">
                     Combining traditional excellence with modern digital tracking to ensure every student reaches their full potential.
                  </p>
               </div>
            </div>
         </div>
      </section>
    </main>
  )
}
