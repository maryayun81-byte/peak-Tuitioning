'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, FolderHeart, Download, Sparkles, Camera } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { getStudentPortfolios, createPortfolio, addPortfolioItem } from '@/app/actions/portfolio'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import Image from 'next/image'

export default function CBCPortfolio() {
  const { student } = useAuthStore()
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Creation State
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false)
  const [newPortTitle, setNewPortTitle] = useState('')
  const [newPortDesc, setNewPortDesc] = useState('')

  // Active Portfolio State
  const [activePortfolio, setActivePortfolio] = useState<any>(null)
  
  // New Item State
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [itemTitle, setItemTitle] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [itemImage, setItemImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (student?.id) loadPortfolios()
  }, [student?.id])

  const loadPortfolios = async () => {
    if (!student?.id) return
    try {
      const data = await getStudentPortfolios(student.id)
      setPortfolios(data)
    } catch (e) {
      toast.error('Failed to load portfolios')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePortfolio = async () => {
    if (!newPortTitle) return
    try {
      await createPortfolio(student!.id, newPortTitle, newPortDesc)
      setIsCreatingPortfolio(false)
      setNewPortTitle('')
      setNewPortDesc('')
      loadPortfolios()
      toast.success('Sticker Book Created!', { icon: '✨' })
      confetti({ particleCount: 50, spread: 60 })
    } catch (e) {
      toast.error('Failed to create portfolio')
    }
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setItemImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAddItem = async () => {
    if (!itemTitle || !itemImage || !activePortfolio) return
    setIsUploading(true)
    try {
      const newItem = await addPortfolioItem(activePortfolio.id, itemTitle, itemImage, itemNotes)
      
      // Optimistic update
      const updatedPortfolio = {
        ...activePortfolio,
        items: [newItem, ...(activePortfolio.items || [])]
      }
      setActivePortfolio(updatedPortfolio)
      
      // Also update the main list
      setPortfolios(portfolios.map(p => p.id === activePortfolio.id ? updatedPortfolio : p))
      
      setIsAddingItem(false)
      setItemTitle('')
      setItemNotes('')
      setItemImage(null)
      toast.success('Sticker Added!', { icon: '🌟' })
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    } catch (e) {
      toast.error('Failed to add item')
    } finally {
      setIsUploading(false)
    }
  }

  const handleExportPDF = () => {
    // In a real app, use html2canvas + jsPDF
    toast.success('Generating PDF... (Mocked)', { icon: '🖨️' })
    setTimeout(() => {
      toast.success('PDF Downloaded!')
    }, 2000)
  }

  if (loading) return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  if (activePortfolio) {
    return (
      <div className="p-6 space-y-8 pb-32 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Button variant="ghost" onClick={() => setActivePortfolio(null)} className="-ml-4 text-muted">
            ← Back to Books
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="rounded-2xl border-dashed">
            <Download size={16} className="mr-2" /> Export for Parents
          </Button>
        </div>

        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">
            {activePortfolio.title}
          </h1>
          <p className="font-bold text-muted">{activePortfolio.description}</p>
        </div>

        <AnimatePresence>
          {isAddingItem && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="p-6 border-pink-500/30 bg-pink-500/5 shadow-2xl mb-8">
                <h3 className="font-black text-xl text-pink-500 mb-4 flex items-center gap-2">
                  <Sparkles size={20} /> New Sticker
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photo Upload Area */}
                  <div 
                    className="border-4 border-dashed border-pink-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-pink-500/10 transition-colors relative overflow-hidden h-64"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {itemImage ? (
                      <div className="absolute inset-0">
                        {/* Use standard img tag for base64 data to avoid next/image domain errors */}
                        <img src={itemImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <>
                        <Camera size={48} className="text-pink-500 mb-4 opacity-50" />
                        <p className="font-black text-pink-500">Tap to Take Photo</p>
                        <p className="text-xs font-bold text-muted mt-2">or upload an image of your work</p>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageCapture} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">What did you make?</label>
                      <Input placeholder="e.g. My Science Project" value={itemTitle} onChange={e => setItemTitle(e.target.value)} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Notes (Optional)</label>
                      <textarea 
                        placeholder="I learned that..." 
                        value={itemNotes} 
                        onChange={e => setItemNotes(e.target.value)}
                        className="w-full min-h-[100px] p-3 text-sm bg-[var(--input)] border border-[var(--card-border)] rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                        style={{ color: 'var(--text)' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => { setIsAddingItem(false); setItemImage(null); }} className="flex-1">Cancel</Button>
                      <Button onClick={handleAddItem} disabled={!itemTitle || !itemImage || isUploading} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white border-none rounded-xl">
                        {isUploading ? 'Saving...' : 'Add to Book'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticker Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Add New Button Card */}
          {!isAddingItem && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card 
                className="aspect-square flex flex-col items-center justify-center text-center cursor-pointer border-4 border-dashed border-pink-500/30 hover:bg-pink-500/5 group transition-all"
                onClick={() => setIsAddingItem(true)}
              >
                <div className="w-16 h-16 rounded-full bg-pink-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/30">
                  <Plus size={32} />
                </div>
                <p className="font-black text-pink-500">Add New Sticker</p>
              </Card>
            </motion.div>
          )}

          {(activePortfolio.items || []).map((item: any, i: number) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.05, rotate: Math.random() * 4 - 2 }}>
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-xl border-8 border-white dark:border-slate-800 bg-white dark:bg-slate-800 group">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <h4 className="font-black text-white text-lg leading-tight">{item.title}</h4>
                  {item.notes && <p className="text-white/80 text-xs mt-1 line-clamp-2">{item.notes}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // PORTFOLIO LIST
  return (
    <div className="p-6 space-y-8 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">My Sticker Books</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Take photos of your projects and drawings to build your CBC portfolio.</p>
        </div>
        <Button onClick={() => setIsCreatingPortfolio(!isCreatingPortfolio)} className="rounded-2xl shadow-lg shadow-pink-500/20 bg-gradient-to-r from-pink-500 to-orange-400 border-none hover:scale-105 transition-transform text-white px-8">
          <FolderHeart size={16} className="mr-2" /> New Book
        </Button>
      </div>

      <AnimatePresence>
        {isCreatingPortfolio && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-6 border-pink-500/20 bg-pink-500/5 shadow-xl mb-6">
              <h3 className="font-black text-lg mb-4 text-pink-500">Create a New Sticker Book</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input placeholder="Book Title (e.g. My Science Projects)" value={newPortTitle} onChange={e => setNewPortTitle(e.target.value)} className="rounded-xl" />
                <Input placeholder="Description" value={newPortDesc} onChange={e => setNewPortDesc(e.target.value)} className="rounded-xl" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCreatingPortfolio(false)}>Cancel</Button>
                <Button onClick={handleCreatePortfolio} disabled={!newPortTitle} className="bg-pink-500 hover:bg-pink-600 text-white border-none rounded-xl">Create</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((port: any) => (
          <motion.div key={port.id} whileHover={{ y: -5 }}>
            <Card className="p-0 h-full flex flex-col group cursor-pointer hover:shadow-2xl hover:shadow-pink-500/20 transition-all overflow-hidden border-2 border-transparent hover:border-pink-500" onClick={() => setActivePortfolio(port)}>
              <div className="h-32 bg-gradient-to-br from-pink-400 to-orange-400 p-6 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                <h3 className="font-black text-2xl text-white relative z-10">{port.title}</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-sm font-bold text-muted mb-6">{port.description || 'A collection of my amazing work.'}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 text-pink-500 font-black text-sm">
                    <ImageIcon size={16} /> {port.items?.length || 0} Stickers
                  </div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Open Book →</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        {portfolios.length === 0 && !isCreatingPortfolio && (
          <Card className="col-span-full p-16 text-center border-dashed">
            <FolderHeart size={64} className="mx-auto text-pink-500/30 mb-4" />
            <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>No Books Yet</h3>
            <p className="text-sm text-muted font-bold mb-6 max-w-sm mx-auto">Start your digital CBC portfolio by creating your first sticker book.</p>
            <Button onClick={() => setIsCreatingPortfolio(true)} className="rounded-2xl bg-pink-500 text-white border-none shadow-xl shadow-pink-500/20 px-8 py-6 text-lg">
              Create My First Book
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
