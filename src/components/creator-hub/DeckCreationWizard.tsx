import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Sparkles, ChevronRight, ChevronLeft, Palette, BookOpen, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getDeckCreationOptions, getCreatorHubMeta } from '@/app/actions/flashcards'
import { useAuthStore } from '@/stores/authStore'

interface DeckCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: any) => void
  registeredSubjects?: { id: string, name: string }[]
}

const PURPOSES = [
  'Quick revision', 'Exam preparation', 'Memorization', 'Formula mastery', 
  'Diagram practice', 'Vocabulary learning', 'Topic recovery', 'Homework support', 
  'Marketplace product'
]

const BACKGROUNDS: Array<{ value: string; isImage?: boolean; url?: string }> = [
  { value: 'bg-gradient-to-br from-blue-500 to-purple-600' },
  { value: 'bg-gradient-to-br from-emerald-400 to-cyan-500' },
  { value: 'bg-gradient-to-br from-rose-400 to-orange-400' },
  { value: 'bg-gradient-to-br from-pink-400 to-purple-500' },
  { value: 'bg-gradient-to-br from-slate-800 to-slate-900' },
  { value: 'bg-indigo-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-purple-600 to-indigo-900 text-white' },
  { value: 'bg-gradient-to-tr from-pink-300 via-purple-300 to-indigo-400' },
  { value: 'bg-gradient-to-br from-fuchsia-300 via-rose-300 to-blue-400' },
  { value: 'bg-slate-900 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black text-white' },
  { value: 'bg-yellow-100 bg-[linear-gradient(45deg,#fcd34d_25%,transparent_25%,transparent_75%,#fcd34d_75%,#fcd34d),linear-gradient(45deg,#fcd34d_25%,transparent_25%,transparent_75%,#fcd34d_75%,#fcd34d)] bg-[size:40px_40px] bg-[position:0_0,20px_20px]' },
]

export default function DeckCreationWizard({ isOpen, onClose, onComplete, registeredSubjects = [] }: DeckCreationWizardProps) {
  const { student } = useAuthStore()
  const [step, setStep] = useState(1)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [dbCurriculums, setDbCurriculums] = useState<any[]>([])
  const [dbClasses, setDbClasses] = useState<any[]>([])
  const [dbSubjects, setDbSubjects] = useState<any[]>([])
  const [studentSubjects, setStudentSubjects] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    curriculum: '',
    className: '',
    topic: '',
    difficulty: 'Medium',
    purpose: '',
    visibility: 'Private',
    allowDownload: false,
    allowDuplication: false,
    useAi: true,
    templateStyle: BACKGROUNDS[0].value,
    coverIcon: '📚'
  })

  const activeBg = BACKGROUNDS.find(b => b.value === formData.templateStyle) || BACKGROUNDS[0]

  useEffect(() => {
    async function fetchOptions() {
      if (!isOpen) return
      setIsLoadingOptions(true)
      try {
        const [opts, meta] = await Promise.all([
          getDeckCreationOptions(),
          student ? getCreatorHubMeta(student.id).catch(() => ({ subjects: [] })) : Promise.resolve({ subjects: [] })
        ])
        setDbCurriculums(opts.curriculums)
        setDbClasses(opts.classes)
        setDbSubjects(opts.subjects)
        if (meta && meta.subjects) {
          setStudentSubjects(meta.subjects)
        }
        if (opts.curriculums.length > 0 && !formData.curriculum) {
          setFormData(prev => ({ ...prev, curriculum: opts.curriculums[0].id }))
        }
      } catch (err) {
        console.error('Failed to load options', err)
      } finally {
        setIsLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [isOpen, student])

  const updateForm = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3))
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1))
  
  const handleComplete = () => {
    onComplete(formData)
    onClose()
  }

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800 font-sans">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <Dialog.Title as="h3" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {step === 1 && <><BookOpen className="text-primary" /> Create New Deck</>}
                    {step === 2 && <><Settings className="text-primary" /> Deck Settings</>}
                    {step === 3 && <><Palette className="text-primary" /> Choose Template</>}
                  </Dialog.Title>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                </div>

                {/* Content Body */}
                <div className="px-6 py-8 min-h-[400px]">
                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deck Title</label>
                        <Input 
                          placeholder="e.g., KCSE Organic Chemistry Revision" 
                          value={formData.title}
                          onChange={(e) => updateForm('title', e.target.value)}
                          className="text-lg py-6 font-medium"
                          autoFocus
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Curriculum</label>
                          <select 
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            value={formData.curriculum}
                            onChange={(e) => {
                              updateForm('curriculum', e.target.value)
                              updateForm('className', '')
                              updateForm('subject', '')
                            }}
                          >
                            {isLoadingOptions ? (
                              <option value="">Loading...</option>
                            ) : (
                              dbCurriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Class / Grade</label>
                          <select 
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            value={formData.className}
                            onChange={(e) => updateForm('className', e.target.value)}
                            disabled={!formData.curriculum || isLoadingOptions}
                          >
                            <option value="">Select class...</option>
                            {dbClasses
                              .filter(c => {
                                if (c.curriculum_id === formData.curriculum) return true;
                                const curName = dbCurriculums.find(cur => cur.id === formData.curriculum)?.name || '';
                                if (curName.includes('8-4-4') && c.name?.includes('Form')) return true;
                                return false;
                              })
                              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                          <select 
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                            value={formData.subject}
                            onChange={(e) => updateForm('subject', e.target.value)}
                            disabled={isLoadingOptions}
                          >
                            <option value="">Select a subject...</option>
                            {registeredSubjects.length > 0 
                              ? registeredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                              : dbSubjects
                                  .filter(s => !formData.className || s.class_id === formData.className || s.curriculum_id === formData.curriculum)
                                  .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                            }
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                          <Input 
                            placeholder="e.g., Hydrocarbons" 
                            value={formData.topic}
                            onChange={(e) => updateForm('topic', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Primary Purpose</label>
                        <div className="flex flex-wrap gap-2">
                          {PURPOSES.map(purpose => (
                            <button 
                              key={purpose}
                              onClick={() => updateForm('purpose', purpose)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${formData.purpose === purpose ? 'bg-primary text-primary-foreground border-primary' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary/50'}`}
                            >
                              {purpose}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">Visibility</label>
                          {['Private', 'Public', 'Marketplace'].map(vis => (
                            <label key={vis} className="flex items-center gap-3 cursor-pointer group" onClick={() => updateForm('visibility', vis)}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.visibility === vis ? 'border-primary' : 'border-slate-300 dark:border-slate-600 group-hover:border-primary/50'}`}>
                                {formData.visibility === vis && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                              </div>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{vis}</span>
                            </label>
                          ))}
                        </div>
                        
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">Permissions & AI</label>
                          
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={formData.allowDownload} onChange={(e) => updateForm('allowDownload', e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 dark:bg-slate-900" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Allow PDF Download</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={formData.allowDuplication} onChange={(e) => updateForm('allowDuplication', e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 dark:bg-slate-900" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Allow Duplication (Fork)</span>
                          </label>

                          <div className="mt-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/50 flex items-start gap-3">
                            <input type="checkbox" checked={formData.useAi} onChange={(e) => updateForm('useAi', e.target.checked)} className="w-5 h-5 mt-0.5 rounded text-purple-600 focus:ring-purple-600 border-purple-300" />
                            <div>
                              <span className="text-purple-900 dark:text-purple-300 font-bold flex items-center gap-1.5">
                                <Sparkles size={14} /> Enable AI Coach Assistance
                              </span>
                              <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">Let Peak Coach help you generate cards, diagrams, and formatting.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Design Your Deck Cover</label>
                        
                        <div className="flex flex-col md:flex-row gap-8">
                          {/* Preview Area */}
                          <div className="flex-1 flex justify-center items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div 
                              className={`w-full max-w-[240px] aspect-[4/3] rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 relative overflow-hidden bg-cover bg-center ${activeBg.isImage ? '' : activeBg.value}`}
                              style={activeBg.isImage ? { backgroundImage: `url(${activeBg.url})` } : {}}
                            >
                              <div className="absolute inset-0 bg-black/20" />
                              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                                <span className="text-5xl drop-shadow-md mb-4">{formData.coverIcon}</span>
                                <h4 className="font-bold text-white text-lg drop-shadow-md line-clamp-2 leading-tight w-full">{formData.title || 'Untitled Deck'}</h4>
                                <p className="text-white/90 text-xs mt-3 font-medium truncate w-full px-2">
                                  {dbClasses.find(c => c.id === formData.className)?.name || formData.className || 'Class'} • {
                                    [...studentSubjects, ...dbSubjects].find(s => s.id === formData.subject)?.name || formData.subject || 'Subject'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex-1 space-y-6">
                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Background Theme</p>
                              <div className="flex flex-wrap gap-2">
                                {BACKGROUNDS.map(bg => (
                                  <button
                                    key={bg.value}
                                    onClick={() => updateForm('templateStyle', bg.value)}
                                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 bg-cover bg-center ${bg.isImage ? '' : bg.value} ${formData.templateStyle === bg.value ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'}`}
                                    style={bg.isImage ? { backgroundImage: `url(${bg.url})` } : {}}
                                  />
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Cover Icon</p>
                              <div className="flex flex-wrap gap-2">
                                {['📚', '🧪', '📐', '🌍', '💻', '🎨', '🚀', '⭐', '🔥', '🧠'].map(icon => (
                                  <button
                                    key={icon}
                                    onClick={() => updateForm('coverIcon', icon)}
                                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${formData.coverIcon === icon ? 'bg-primary/10 text-primary border-primary border-2 scale-110' : 'bg-slate-100 dark:bg-slate-800 border-transparent border-2 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                  >
                                    {icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  {step > 1 ? (
                    <Button variant="outline" onClick={handlePrev} className="gap-2 font-bold">
                      <ChevronLeft size={16} /> Back
                    </Button>
                  ) : <div />}
                  
                  {step < 3 ? (
                    <Button onClick={handleNext} disabled={!formData.title || !formData.subject} className="gap-2 font-bold px-6">
                      Continue <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button onClick={handleComplete} className="gap-2 font-bold bg-primary text-primary-foreground px-8 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/30">
                      <Sparkles size={16} /> Create Deck
                    </Button>
                  )}
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
