'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, History, Rocket, Heart, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0A0F1C] text-white">
      {/* Hero */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/10 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-8 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter leading-none">
            Empowering <br />
            <span className="text-emerald-500">Academic Mastery</span>
          </h1>
          <p className="text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
            Established in 2023, Peak Performance Tutoring helps students in Kenya achieve academic excellence through structured teaching, modern tools, and personalized support for both KCSE and CBC learners.
          </p>
        </div>
      </div>

      {/* Philosophy Section */}
      <section className="py-24 px-6">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <History className="text-emerald-400" />, title: "Our History", desc: "Founded in 2023 with a mission to modernize tutoring in Nairobi and across Kenya." },
              { icon: <Rocket className="text-blue-400" />, title: "Our Mission", desc: "Providing structured holiday tuition and KCSE revision programs that actually deliver results." },
              { icon: <Heart className="text-rose-400" />, title: "Our Culture", desc: "A passion for education that supports both secondary school students and CBC learners." }
            ].map((box, i) => (
              <div key={i} className="p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                   {box.icon}
                 </div>
                 <h3 className="text-xl font-bold uppercase mb-3">{box.title}</h3>
                 <p className="text-white/50 text-sm leading-relaxed">{box.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* History Detail */}
      <section className="py-24 px-6 border-t border-white/5">
         <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
               <h2 className="text-4xl font-black uppercase tracking-tight">The Peak Vision</h2>
               <p className="text-white/60 text-lg">Leading the way in personalized education since 2023.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <div className="rounded-[3rem] overflow-hidden border border-white/10">
                  <img src="/media__1776583920902.jpg" alt="Tutoring History" className="w-full h-80 object-cover" />
               </div>
               <div className="space-y-6">
                  <p className="text-white/70 leading-relaxed italic">
                     "Peak Performance Tutoring was created to bridge the gap between classroom teaching and individual student potential. We believe every student in Kenya deserves access to high-quality KCSE revision and CBC support regardless of their background."
                  </p>
                  <div className="space-y-3">
                     {[
                        "Expert Tutors with Years of Experience",
                        "Modern Subject-Focused Revision Nodes",
                        "Continuous Performance Tracking",
                        "Support for all Secondary School Levels"
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm font-bold opacity-80">
                           <CheckCircle2 size={16} className="text-emerald-500" /> {item}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>
    </main>
  )
}
