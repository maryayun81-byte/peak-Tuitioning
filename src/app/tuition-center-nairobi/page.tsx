'use client'

import { motion } from 'framer-motion'
import { 
  MapPin, Phone, Mail, Clock, Globe, 
  ShieldCheck, Award, Users, Sparkles,
  ArrowRight, Navigation, LayoutGrid, 
  GraduationCap, Beaker, Zap, Quote
} from 'lucide-react'
import Link from 'next/link'

const FACILITIES = [
  { name: 'Pure STEM Labs', desc: 'Fully equipped biological and chemical analysis units.', icon: <Beaker className="text-emerald-400" /> },
  { name: 'Digital Node', desc: 'High-speed research bay with AI-powered study assistants.', icon: <Zap className="text-blue-400" /> },
  { name: 'Study Sanctuary', desc: 'Noise-controlled, ergonomic zones for deep work.', icon: <ShieldCheck className="text-purple-400" /> },
  { name: 'Mentorship Lounge', desc: 'Open collaborative space for peer-to-peer acceleration.', icon: <Users className="text-rose-400" /> },
]

export default function NairobiCenterPage() {
  return (
    <main className="relative min-h-screen bg-[#03050C] text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#101a1a_0%,#03050c_100%)]" />
        <div className="absolute top-0 left-1/3 w-full h-full bg-emerald-500/5 blur-[180px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      <nav className="relative z-50 px-8 lg:px-16 py-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl group-hover:rotate-12 transition-transform">
             <MapPin size={20} />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px]">Peak Hubs</span>
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <span className="px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.5em] mb-10 inline-block">
               The Primary Hub
            </span>
            <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8">
              Nairobi<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 italic">Core.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/40 font-medium leading-relaxed max-w-xl">
              Our flagship STEM-Specialized Tuition Center in Nairobi. A distraction-free sanctuary for the city's most ambitious academic minds.
            </p>
            <div className="mt-12 flex gap-4">
               <button className="px-10 py-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-all">
                  Book a Visit
               </button>
               <Link href="/about" className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                  Center Protocols
               </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }}
            className="relative h-[600px] rounded-[4rem] border border-white/10 overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[url('/media__1776963140564.jpg')] bg-cover bg-center group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#03050C] via-transparent to-transparent" />
            <div className="absolute bottom-12 left-12 right-12 p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-between">
               <div>
                  <div className="font-black uppercase tracking-tighter text-xl">The Main Atrium</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Nairobi Primary Hub</div>
               </div>
               <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl">
                  <Navigation size={20} />
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT BENTO ── */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
           
           {/* Info Card */}
           <div className="md:col-span-4 space-y-8">
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-8 hover:bg-white/[0.05] transition-all">
                 <h3 className="text-3xl font-black uppercase tracking-tighter">Reach Out</h3>
                 <div className="space-y-6">
                    <div className="flex items-center gap-5 group">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <Phone size={20} />
                       </div>
                       <div className="font-black text-sm tracking-widest">+254 700 000 000</div>
                    </div>
                    <div className="flex items-center gap-5 group">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <Mail size={20} />
                       </div>
                       <div className="font-black text-sm tracking-widest">hello@peakcampus.ke</div>
                    </div>
                    <div className="flex items-center gap-5 group">
                       <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                          <Clock size={20} />
                       </div>
                       <div className="font-black text-sm tracking-widest">08:00 - 18:00 DAILY</div>
                    </div>
                 </div>
              </div>
              <div className="p-10 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 text-center space-y-4">
                 <div className="text-sm font-black uppercase tracking-widest">Open Admission</div>
                 <div className="text-xs text-white/60 font-medium">Register for 2026 Intake now</div>
                 <button className="w-full py-4 rounded-xl bg-white text-[#03050C] font-black uppercase tracking-widest text-[9px] shadow-2xl">Register Student</button>
              </div>
           </div>

           {/* Location Map Placeholder / Cinematic Card */}
           <div className="md:col-span-8 relative rounded-[3rem] bg-[#020408] border border-white/5 overflow-hidden group">
              <div className="absolute inset-0 bg-[url('/media__1776963140335.jpg')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#03050C] via-transparent to-transparent" />
              <div className="absolute top-12 left-12 p-8 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 max-w-sm space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl">
                    <MapPin size={24} />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter">Strategic Access</h3>
                 <p className="text-sm text-white/40 font-medium leading-relaxed">Located in the heart of Nairobi's academic belt, easily accessible for students from across the city.</p>
                 <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 group">
                    Open in Navigation <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </div>
        </div>
      </section>

      {/* ── FACILITIES: GRID ── */}
      <section className="relative z-10 py-32 px-6 bg-white/[0.01] border-y border-white/5">
         <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-6">
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">Center Infrastructure</span>
               <h2 className="text-6xl font-black uppercase tracking-tighter">Engineered for <span className="text-white/20 italic">Focus.</span></h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
               {FACILITIES.map((f, i) => (
                  <motion.div key={i} whileHover={{ y: -10 }} className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group">
                     <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        {f.icon}
                     </div>
                     <h3 className="text-xl font-black uppercase tracking-tighter mb-4">{f.name}</h3>
                     <p className="text-sm text-white/40 font-medium leading-relaxed">{f.desc}</p>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* ── QUOTE / FINAL CALL ── */}
      <section className="relative z-10 py-48 px-6 text-center">
         <div className="max-w-4xl mx-auto space-y-12">
            <Quote size={64} className="mx-auto text-emerald-500/20" />
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic">
              "The environment is the silent teacher. We have built a center that demands excellence from the moment you step inside."
            </h2>
            <div className="h-px w-24 bg-emerald-500 mx-auto" />
            <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Peak Campus Operations</div>
         </div>
      </section>

      <footer className="relative z-10 py-20 px-10 border-t border-white/5 text-center">
         <p className="text-[10px] text-white/20 font-black tracking-[0.4em] uppercase">NAIROBI HUB • PEAK CAMPUS • STEM SPECIALIZED</p>
      </footer>
    </main>
  )
}
