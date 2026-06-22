import React from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { 
  ArrowRight, 
  ArrowDown, 
  Calculator, 
  Thermometer, 
  FlaskConical, 
  Activity, 
  Zap, 
  CheckCircle2,
  Scale
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Given Data', desc: 'Identify mass, initial/final temp, volume/conc.', icon: FlaskConical },
  { id: 2, title: 'Find Mass/Volume', desc: 'm = v x d (Usually density = 1g/cm³).', icon: Scale },
  { id: 3, title: 'Calc ΔT', desc: 'Final Temp - Initial Temp.', icon: Thermometer },
  { id: 4, title: 'Use mcΔT', desc: 'Q = mcΔT (c = 4.2 J/g/K).', icon: Calculator },
  { id: 5, title: 'Convert J to kJ', desc: 'Divide Q by 1000.', icon: Activity },
  { id: 6, title: 'Calc Moles', desc: 'n = c x v / 1000 or m/RFM.', icon: FlaskConical },
  { id: 7, title: 'Find ΔH per mole', desc: 'ΔH = kJ / moles.', icon: Zap },
  { id: 8, title: 'Add Sign', desc: 'Exo = -, Endo = +.', icon: CheckCircle2 },
];

export default function CalorimetryCalculationsPage() {
  return (
    <BuilderLayout
      title="Calorimetry & Calculations"
      subtitle="Enthalpy Changes Engine"
      backHref="/teacher/resources/chemistry/enthalpy"
    >
      <div className="space-y-8 pb-12">
        {/* Visual Flow Builder */}
        <section className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
              <Activity className="w-7 h-7 mr-3 text-blue-500" />
              KCSE Calculation Sequence
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Follow this step-by-step engine to solve any enthalpy change problem accurately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {steps.map((step, index) => (
              <div key={step.id} className="relative group z-10">
                <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-5 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-md h-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">
                    Step {step.id}: {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Horizontal Arrows for Desktop (except end of row) */}
                {(index + 1) % 4 !== 0 && index !== steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-0">
                    <ArrowRight className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                  </div>
                )}

                {/* Vertical Wrap-around Arrow for end of first row */}
                {(index + 1) === 4 && (
                  <div className="hidden lg:flex absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-0 justify-center w-full">
                     <ArrowDown className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                  </div>
                )}

                {/* Mobile/Tablet Vertical arrows */}
                {index !== steps.length - 1 && (
                  <div className="flex lg:hidden justify-center my-2 text-slate-200 dark:text-slate-700">
                     <ArrowDown className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bond Energy Section */}
        <section className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl p-6 md:p-8 border border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="mb-8 relative z-10">
            <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center">
              <Zap className="w-7 h-7 mr-3 text-indigo-500" />
              Bond Energy Calculation
            </h2>
            <p className="text-indigo-700/70 dark:text-indigo-300/70 mt-2">
              Calculate total enthalpy change based on bond breaking and forming.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center relative z-10">
            {/* Bonds Broken */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 flex-1 w-full transform hover:-translate-y-1 transition-transform duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Bonds Broken</h3>
              <p className="text-sm font-medium text-rose-500/80 dark:text-rose-400/80 mb-4 uppercase tracking-wider">Reactants (Endothermic)</p>
              <div className="text-3xl font-black text-rose-500 dark:text-rose-400">+ Energy IN</div>
            </div>

            {/* Minus Sign */}
            <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 w-14 h-14 rounded-full flex items-center justify-center shadow-inner border border-indigo-200 dark:border-indigo-700">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">-</span>
            </div>

            {/* Bonds Formed */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 flex-1 w-full transform hover:-translate-y-1 transition-transform duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Bonds Formed</h3>
              <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80 mb-4 uppercase tracking-wider">Products (Exothermic)</p>
              <div className="text-3xl font-black text-emerald-500 dark:text-emerald-400">- Energy OUT</div>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 text-center shadow-lg relative z-10">
            <div className="text-2xl md:text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              ΔH = Σ(Bonds Broken) - Σ(Bonds Formed)
            </div>
          </div>
        </section>
      </div>
    </BuilderLayout>
  );
}
