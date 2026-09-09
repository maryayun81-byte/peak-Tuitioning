'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const PROGRAMMES = [
  {
    name: 'Holiday Group Tuition',
    tag: 'MOST POPULAR',
    tagColor: 'bg-peak-green text-white',
    desc: 'Intensive small-group tuition every school holiday — April, August and November. Diagnosis, targeted teaching and exam technique in one focused block.',
    points: ['April intake', 'August intake', 'November intake', 'Small focused groups'],
    cta: 'Book Holiday Slot',
  },
  {
    name: 'Homeschooling',
    tag: 'PERSONALISED',
    tagColor: 'bg-peak-blue text-white',
    desc: 'A full personal learning programme: weekly timetable, teacher-led and self-study sessions, Peak Coach AI support and parent reporting.',
    points: ['Personal timetable', 'Teacher + AI support', 'Weekly parent reports', 'Own pace, real evidence'],
    cta: 'Ask About Homeschooling',
  },
  {
    name: 'Home Tuition',
    tag: '1-ON-1',
    tagColor: 'bg-slate-900 text-white',
    desc: 'A tutor at your home, fully focused on your child. Flexible scheduling, all subjects, all levels.',
    points: ['One-on-one attention', 'At your home', 'Flexible hours', 'All subjects'],
    cta: 'Request a Tutor',
  },
]

const FEES = [
  { group: 'Senior School & Form 4', detail: 'Holiday group tuition · per week', price: 'KSh 1,250' },
  { group: 'Grades 4 – 9', detail: 'Holiday group tuition · per week', price: 'KSh 1,000' },
  { group: 'Home Tuition', detail: 'One-on-one · per hour', price: 'KSh 1,000' },
]

const WA_LINK = 'https://wa.me/254798971625?text=Hello%20Peak%20Performance%20Tutoring%2C%20I%20would%20like%20to%20ask%20about%20your%20programmes%20and%20fees.'

export function ProgrammesAndFees() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="fees" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-slate-50">
      <div className="relative z-10 landing-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-green mb-4 block">PROGRAMMES & FEES</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Pick the Route
            <br />
            <span className="text-peak-green">That Fits Your Child.</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3 max-w-xl mx-auto">
            Clear programmes, clear pricing. No hidden charges — ask us anything on WhatsApp.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6 mb-8 md:mb-10">
          {PROGRAMMES.map((prog, i) => (
            <motion.div
              key={prog.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.12 }}
              className="relative bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <span className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${prog.tagColor}`}>
                {prog.tag}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">{prog.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{prog.desc}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {prog.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-peak-green shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-peak-green transition-colors min-h-[48px]"
              >
                {prog.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
        >
          <div className="px-6 sm:px-8 pt-6 pb-2">
            <h3 className="text-base font-bold text-slate-900">Simple, honest fees</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {FEES.map((fee) => (
              <div key={fee.group} className="flex items-center justify-between gap-4 px-6 sm:px-8 py-4">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold text-slate-900">{fee.group}</p>
                  <p className="text-xs text-slate-500">{fee.detail}</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-peak-green whitespace-nowrap">{fee.price}</p>
              </div>
            ))}
          </div>
          <div className="px-6 sm:px-8 py-5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Homeschooling fees are tailored to the programme — talk to us and we&apos;ll build a plan around your child.
            </p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:shadow-lg transition-all whitespace-nowrap min-h-[48px] w-full sm:w-auto"
            >
              Ask on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
