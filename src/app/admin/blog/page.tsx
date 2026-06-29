'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, Edit, Eye, ImagePlus, Plus, Send, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonCard } from '@/components/ui/Skeleton'

type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url?: string | null
  category: string
  author_name: string
  read_minutes: number
  is_published: boolean
  published_at?: string | null
  created_at: string
}

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category: 'Study Strategy',
  author_name: 'Peak Performance Team',
  read_minutes: 4,
  is_published: false,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function normalizeBlogImageUrl(rawValue: string) {
  const raw = String(rawValue || '').trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  const cleanPath = raw.replace(/^blog-images\//, '').replace(/^public\//, '').replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/blog-images/${cleanPath}` : raw
}

export default function AdminBlogPage() {
  const supabase = getSupabaseBrowserClient()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [uploading, setUploading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  const publicUrl = useMemo(() => {
    return form.slug && origin ? `${origin}/blog/${form.slug}` : ''
  }, [form.slug, origin])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketing_blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setPosts((data || []) as BlogPost[])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (post: BlogPost) => {
    setEditing(post)
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      cover_image_url: post.cover_image_url || '',
      category: post.category || 'Study Strategy',
      author_name: post.author_name || 'Peak Performance Team',
      read_minutes: Number(post.read_minutes) || 4,
      is_published: Boolean(post.is_published),
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Add a blog title')
    if (!form.excerpt.trim()) return toast.error('Add a short excerpt')
    if (!form.content.trim()) return toast.error('Add blog content')
    const slug = form.slug.trim() || slugify(form.title)
    if (!slug) return toast.error('Add a valid slug')

    const payload = {
      ...form,
      slug,
      cover_image_url: normalizeBlogImageUrl(form.cover_image_url),
      read_minutes: Math.max(1, Number(form.read_minutes) || 4),
      published_at: form.is_published ? (editing?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }

    const mutation = editing
      ? await supabase.from('marketing_blog_posts').update(payload).eq('id', editing.id)
      : await supabase.from('marketing_blog_posts').insert(payload)
    if (mutation.error) return toast.error(mutation.error.message)
    toast.success(editing ? 'Blog updated' : 'Blog created')
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
    load()
  }

  const deletePost = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"?`)) return
    const { error } = await supabase.from('marketing_blog_posts').delete().eq('id', post.id)
    if (error) return toast.error(error.message)
    toast.success('Blog deleted')
    load()
  }

  const uploadCover = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Upload an image file')
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('blog-images').upload(path, file, { upsert: true })
      if (error) {
        toast.error(`${error.message}. Make sure the blog-images bucket migration has run.`)
        return
      }
      const { data } = supabase.storage.from('blog-images').getPublicUrl(path)
      setForm((prev) => ({ ...prev, cover_image_url: data.publicUrl }))
      toast.success('Cover image uploaded')
    } finally {
      setUploading(false)
    }
  }

  const copyShareUrl = async (slug: string) => {
    const url = `${origin}/blog/${slug}`
    await navigator.clipboard.writeText(url)
    toast.success('Blog link copied')
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Peak Marketing</p>
          <h1 className="mt-2 text-3xl font-black" style={{ color: 'var(--text)' }}>Blog & Insights</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Publish parent-facing articles, SEO content, study guides and campaign stories.</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Blog</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <SkeletonCard key={item} />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className="h-full overflow-hidden">
                <div className="relative h-48 bg-[var(--input)]">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-primary"><ImagePlus size={34} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <Badge className="absolute left-4 top-4" variant={post.is_published ? 'success' : 'warning'}>
                    {post.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a5ef87]">{post.category}</div>
                    <h2 className="mt-1 line-clamp-2 text-xl font-black leading-tight">{post.title}</h2>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="relative h-[4.5rem] overflow-hidden">
                    <p className="text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{post.excerpt}</p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--card)] to-transparent" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-muted">
                    <span>{post.read_minutes} min read</span>
                    <span>{post.author_name}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => openEdit(post)} className="rounded-xl bg-[var(--input)] p-2 text-muted hover:text-primary"><Edit size={15} /></button>
                    <button onClick={() => copyShareUrl(post.slug)} className="rounded-xl bg-[var(--input)] p-2 text-muted hover:text-primary"><Copy size={15} /></button>
                    <a href={`/blog/${post.slug}`} target="_blank" className="grid place-items-center rounded-xl bg-[var(--input)] p-2 text-muted hover:text-primary"><Eye size={15} /></a>
                    <button onClick={() => deletePost(post)} className="rounded-xl bg-red-500/10 p-2 text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-[var(--card-border)] p-12 text-center text-sm font-bold text-muted">
              No blogs yet. Create your first Peak insight.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Blog' : 'New Blog'} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              <Input label="Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value, slug: prev.slug || slugify(event.target.value) }))} />
              <Input label="Slug" value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} />
              <Textarea label="Excerpt" rows={3} value={form.excerpt} onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))} />
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
              <div className="relative mb-3 h-36 overflow-hidden rounded-xl bg-[var(--card)]">
                {form.cover_image_url ? <img src={form.cover_image_url} alt="Cover preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><ImagePlus size={30} /></div>}
              </div>
              <Input placeholder="Cover image URL" value={form.cover_image_url} onChange={(event) => setForm((prev) => ({ ...prev, cover_image_url: event.target.value }))} />
              <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white">
                <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload Cover'}
                <input type="file" accept="image/*" disabled={uploading} className="hidden" onChange={(event) => uploadCover(event.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
              <option>Study Strategy</option>
              <option>KCSE Revision</option>
              <option>CBC Learning</option>
              <option>Holiday Tuition</option>
              <option>Parent Guide</option>
              <option>Peak News</option>
            </Select>
            <Input label="Author" value={form.author_name} onChange={(event) => setForm((prev) => ({ ...prev, author_name: event.target.value }))} />
            <Input label="Read Minutes" type="number" min={1} value={form.read_minutes} onChange={(event) => setForm((prev) => ({ ...prev, read_minutes: Number(event.target.value) || 4 }))} />
          </div>

          <Textarea label="Article Content" rows={12} value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />

          {publicUrl && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--input)] p-3">
              <span className="min-w-0 truncate text-xs font-bold text-muted">{publicUrl}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success('Share link copied'))} className="shrink-0 text-xs font-black text-primary">Copy Link</button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={form.is_published} onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))} />
              Publish on website
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{form.is_published ? <Send size={15} /> : <Edit size={15} />} {editing ? 'Update Blog' : 'Create Blog'}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
