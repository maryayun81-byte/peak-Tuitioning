'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Trash2, BookOpen, 
  ExternalLink, Upload, Star, Library,
  ChevronRight, Save, X, Globe
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

const CATEGORIES = ['Communication', 'Money', 'Self-worth', 'Mindset', 'Working Smart', 'Leadership', 'Other']

export default function AdminLibrary() {
  const supabase = getSupabaseBrowserClient()
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [externalSearch, setExternalSearch] = useState('')
  const [externalResults, setExternalResults] = useState<any[]>([])
  const [searchingExternal, setSearchingExternal] = useState(false)
  
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any | null>(null)

  // Form states
  const [formData, setFormData] = useState<any>({
    title: '', author: '', description: '', cover_url: '', 
    category: 'Mindset', importance: '', benefits: '', relevance: '',
    external_id: '', pdf_url: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadBooks() }, [])

  const loadBooks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('library_books')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) toast.error('Failed to load library')
    else setBooks(data || [])
    setLoading(false)
  }

  const handleExternalSearch = async () => {
    if (!externalSearch.trim()) return
    setSearchingExternal(true)
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(externalSearch)}&maxResults=10`)
      const data = await res.json()
      setExternalResults(data.items || [])
    } catch (err) {
      toast.error('Search failed')
    } finally {
      setSearchingExternal(false)
    }
  }

  const startImport = (item: any) => {
    const info = item.volumeInfo
    setFormData({
      title: info.title || '',
      author: info.authors?.[0] || 'Unknown Author',
      description: info.description || '',
      cover_url: info.imageLinks?.thumbnail || '',
      external_id: item.id,
      category: 'Mindset',
      importance: '', benefits: '', relevance: '',
      pdf_url: ''
    })
    setAddOpen(false)
    setEditOpen(true)
    setSelectedBook(null) // Mark as new
  }

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('library-books')
      .upload(filePath, file)

    if (uploadError) {
      toast.error('Upload failed')
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('library-books')
        .getPublicUrl(filePath)
      setFormData({ ...formData, pdf_url: publicUrl })
      toast.success('PDF Uploaded!')
    }
    setUploading(false)
  }

  const saveBook = async () => {
    setLoading(true)
    const dataToSave = { ...formData }
    
    let error
    if (selectedBook) {
      const res = await supabase.from('library_books').update(dataToSave).eq('id', selectedBook.id)
      error = res.error
    } else {
      const res = await supabase.from('library_books').insert(dataToSave)
      error = res.error
    }

    if (error) {
      toast.error('Save failed: ' + error.message)
    } else {
      toast.success(selectedBook ? 'Book updated' : 'Book added to Library!')
      setEditOpen(false)
      loadBooks()
    }
    setLoading(false)
  }

  const deleteBook = async () => {
    if (!selectedBook) return
    const { error } = await supabase.from('library_books').delete().eq('id', selectedBook.id)
    if (error) toast.error('Delete failed')
    else {
      toast.success('Book removed')
      loadBooks()
      setDeleteOpen(false)
    }
  }

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Peak Library</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Curate mindset and growth literature for students</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Globe size={16} /> Discover Books
        </Button>
      </div>

      {/* Internal Management */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search library..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none outline-none font-medium"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <SkeletonList count={8} />
        ) : filteredBooks.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--card)] rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-[var(--card-border)]">
              <Library size={32} className="opacity-30" />
            </div>
            <p className="text-muted font-medium">Your library is empty. Use Discover to add books.</p>
          </div>
        ) : (
          filteredBooks.map((book, i) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-0 h-full flex flex-col overflow-hidden border border-[var(--card-border)] bg-[var(--card)] group">
                <div className="relative h-48 bg-black/5 flex items-center justify-center overflow-hidden">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <BookOpen size={48} className="opacity-20" />
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="primary">{book.category}</Badge>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight line-clamp-1">{book.title}</h3>
                    <p className="text-xs font-bold text-primary mt-1">{book.author}</p>
                    <p className="text-[10px] mt-2 line-clamp-3 leading-relaxed opacity-60 font-medium">
                      {book.description}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => { setSelectedBook(book); setFormData(book); setEditOpen(true); }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => { setSelectedBook(book); setDeleteOpen(true) }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Discovery Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Discover & Import Books" size="lg">
        <div className="space-y-6">
          <div className="flex gap-2">
            <Input 
              placeholder="Search Google Books (e.g. Atomic Habits, Mindset...)" 
              value={externalSearch}
              onChange={e => setExternalSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExternalSearch()}
            />
            <Button onClick={handleExternalSearch} disabled={searchingExternal}>
              {searchingExternal ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
            {externalResults.map((item: any) => (
              <div 
                key={item.id} 
                className="flex gap-4 p-3 rounded-xl bg-[var(--input)] hover:bg-black/5 cursor-pointer transition-colors border border-transparent hover:border-primary/20"
                onClick={() => startImport(item)}
              >
                <img src={item.volumeInfo.imageLinks?.thumbnail} alt="" className="w-16 h-20 object-cover rounded shadow-md" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs uppercase line-clamp-1">{item.volumeInfo.title}</h4>
                  <p className="text-[10px] text-primary font-bold mt-1">{item.volumeInfo.authors?.[0]}</p>
                  <p className="text-[10px] opacity-60 line-clamp-2 mt-1">{item.volumeInfo.description}</p>
                </div>
                <div className="flex items-center">
                  <Plus size={16} className="text-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit/Setup Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={selectedBook ? "Edit Book" : "Setup Peak Book"} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-[var(--input)] flex gap-4">
                <img src={formData.cover_url} className="w-20 h-28 object-cover rounded-lg shadow-xl" />
                <div className="space-y-1">
                   <h3 className="font-black text-sm uppercase leading-tight">{formData.title}</h3>
                   <p className="text-xs font-bold text-primary">{formData.author}</p>
                </div>
             </div>
             
             <Select label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
             </Select>

             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted">Upload Full Novel (PDF)</label>
               <div className="relative group">
                 <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                 />
                 <div className="p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-primary transition-colors">
                    <Upload size={24} className={formData.pdf_url ? 'text-emerald-500' : 'text-muted'} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {uploading ? 'Uploading...' : formData.pdf_url ? 'PDF Ready!' : 'Click to upload PDF'}
                    </span>
                 </div>
               </div>
               {formData.pdf_url && <p className="text-[10px] text-emerald-500 font-bold mt-1 absolute truncate w-full">✅ File linked successfully</p>}
             </div>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
            <Textarea label="Why this matters" placeholder="Importance of this book..." rows={3} value={formData.importance} onChange={e => setFormData({...formData, importance: e.target.value})} />
            <Textarea label="Key Benefits" placeholder="What will the student learn?" rows={3} value={formData.benefits} onChange={e => setFormData({...formData, benefits: e.target.value})} />
            <Textarea label="Peak Relevance" placeholder="How does it help their growth?" rows={3} value={formData.relevance} onChange={e => setFormData({...formData, relevance: e.target.value})} />
            <Textarea label="Description" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-6 mt-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveBook} disabled={loading}>{loading ? 'Saving...' : 'Save to Peak Library'}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteBook}
        title="Remove Book"
        message={`Are you sure you want to remove ${selectedBook?.title}? Records of student progress for this book will be lost.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
