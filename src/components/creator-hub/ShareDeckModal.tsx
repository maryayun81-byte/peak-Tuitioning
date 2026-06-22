import React, { useState } from 'react'
import { Dialog, Transition, Switch } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Copy, Check, Users, GitFork, Globe, Lock } from 'lucide-react'

interface ShareDeckModalProps {
  isOpen: boolean
  onClose: () => void
  deckTitle: string
}

export default function ShareDeckModal({ isOpen, onClose, deckTitle }: ShareDeckModalProps) {
  const [isPublic, setIsPublic] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const deckUrl = `https://peaktuition.edu/deck/${deckTitle.toLowerCase().replace(/\s+/g, '-')}`

  const handleCopy = () => {
    navigator.clipboard.writeText(deckUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left align-middle shadow-xl transition-all">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-slate-900 dark:text-white">
                    Share Deck
                  </Dialog.Title>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-6 space-y-6">
                  {/* Visibility Toggle */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isPublic ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {isPublic ? <Globe size={20} /> : <Lock size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {isPublic ? 'Public on Marketplace' : 'Private'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {isPublic 
                            ? 'Anyone can discover, view, and fork this deck in the marketplace.' 
                            : 'Only you and people you invite can view this deck.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isPublic}
                      onChange={setIsPublic}
                      className={`${isPublic ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}
                        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-opacity-75`}
                    >
                      <span className="sr-only">Toggle Visibility</span>
                      <span
                        aria-hidden="true"
                        className={`${isPublic ? 'translate-x-5' : 'translate-x-0'}
                          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                      />
                    </Switch>
                  </div>

                  {/* Copy Link */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Share Link</label>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={deckUrl} 
                        className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 outline-none"
                      />
                      <button 
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors w-24 shrink-0"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Collaboration Actions */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Collaboration</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                        <Users className="text-slate-400 group-hover:text-primary transition-colors" size={24} />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Invite Editors</span>
                      </button>
                      <button className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
                        <GitFork className="text-slate-400 group-hover:text-emerald-500 transition-colors" size={24} />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Allow Forking</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
