import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Printer, MessageCircle, DownloadCloud, Presentation, Store, ChevronRight, FileImage, FileText, LayoutGrid } from 'lucide-react'

interface ExportWizardModalProps {
  isOpen: boolean
  onClose: () => void
  onExportAction: (action: string, options: any) => void
  isExporting: boolean
}

export default function ExportWizardModal({ isOpen, onClose, onExportAction, isExporting }: ExportWizardModalProps) {
  const [step, setStep] = useState(1)
  const [intent, setIntent] = useState<string | null>(null)

  const intents = [
    { id: 'print', title: 'Print for class', icon: <Printer size={24} className="text-blue-500" />, desc: 'PDF layouts for cutting or booklets' },
    { id: 'whatsapp', title: 'Share on WhatsApp', icon: <MessageCircle size={24} className="text-emerald-500" />, desc: 'High-res images or ZIP files' },
    { id: 'offline', title: 'Study offline', icon: <DownloadCloud size={24} className="text-purple-500" />, desc: 'Export as a revision study sheet' },
    { id: 'presentation', title: 'Use in presentation', icon: <Presentation size={24} className="text-orange-500" />, desc: 'PowerPoint slide format' },
    { id: 'sell', title: 'Sell as protected deck', icon: <Store size={24} className="text-pink-500" />, desc: 'Marketplace settings and watermarks' },
  ]

  const handleIntentSelect = (id: string) => {
    setIntent(id)
    setStep(2)
  }

  const renderOptions = () => {
    if (intent === 'print') {
      return (
        <div className="space-y-3">
          <button onClick={() => onExportAction('pdf_cut', {})} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <LayoutGrid size={20} className="text-blue-500" />
              <div className="text-left">
                <h4 className="font-bold text-slate-900 dark:text-white">Flashcard Cutting Sheet</h4>
                <p className="text-xs text-slate-500">3x2 grid with cutting lines</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
          {/* Add more PDF options here based on spec */}
        </div>
      )
    }

    if (intent === 'whatsapp') {
      return (
        <div className="space-y-3">
          <button onClick={() => onExportAction('png_current', {})} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <FileImage size={20} className="text-emerald-500" />
              <div className="text-left">
                <h4 className="font-bold text-slate-900 dark:text-white">Current Card (PNG)</h4>
                <p className="text-xs text-slate-500">High quality image of the active card</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
          <button onClick={() => onExportAction('zip_all', {})} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <FileImage size={20} className="text-emerald-500" />
              <div className="text-left">
                <h4 className="font-bold text-slate-900 dark:text-white">All Cards (ZIP)</h4>
                <p className="text-xs text-slate-500">Download every card in the deck</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>
      )
    }
    
    if (intent === 'presentation') {
      return (
        <div className="space-y-3">
          <button onClick={() => onExportAction('pptx', {})} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <Presentation size={20} className="text-orange-500" />
              <div className="text-left">
                <h4 className="font-bold text-slate-900 dark:text-white">PowerPoint Slides</h4>
                <p className="text-xs text-slate-500">Each card becomes a beautiful slide</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>
      )
    }

    // Fallbacks for other intents
    return (
      <div className="p-8 text-center text-slate-500">
        <p>This export module is currently under construction!</p>
      </div>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-left align-middle shadow-2xl transition-all font-sans">
                
                {isExporting && (
                  <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generating Export...</h3>
                    <p className="text-sm text-slate-500 mt-2">This may take a few moments for large decks.</p>
                  </div>
                )}

                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                  <Dialog.Title as="h3" className="text-xl font-black text-slate-900 dark:text-white">
                    {step === 1 ? 'Export Deck' : intents.find(i => i.id === intent)?.title}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-8">
                  {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">What do you want to do?</h4>
                      <div className="space-y-3">
                        {intents.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleIntentSelect(item.id)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all group text-left"
                          >
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{item.title}</h3>
                              <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                      <button onClick={() => setStep(1)} className="text-sm font-bold text-primary mb-4 flex items-center hover:underline">
                        ← Back to options
                      </button>
                      {renderOptions()}
                    </div>
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
