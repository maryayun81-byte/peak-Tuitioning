'use server'

import { createAdminClient } from '@/lib/supabase/server'

export type MarketingBlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl: string
  category: string
  authorName: string
  readMinutes: number
  publishedAt: string | null
  createdAt: string
}

function normalizeImageUrl(rawValue: unknown, bucket = 'blog-images') {
  const raw = String(rawValue || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  const cleanPath = raw.replace(new RegExp(`^${bucket}/`), '').replace(/^public\//, '').replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${cleanPath}` : raw
}

function mapPost(row: any): MarketingBlogPost {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    excerpt: String(row.excerpt || ''),
    content: String(row.content || ''),
    coverImageUrl: normalizeImageUrl(row.cover_image_url),
    category: String(row.category || 'Peak Insights'),
    authorName: String(row.author_name || 'Peak Performance Team'),
    readMinutes: Number(row.read_minutes) || 4,
    publishedAt: row.published_at || null,
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export async function getPublicBlogPosts(limit = 6) {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('marketing_blog_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { success: false, posts: [], error: error.message }
    return { success: true, posts: (data || []).map(mapPost) }
  } catch (error: any) {
    return { success: false, posts: [], error: error?.message || 'Could not load blog posts.' }
  }
}

export async function getPublicBlogPostBySlug(slug: string) {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('marketing_blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    if (error) return { success: false, post: null, error: error.message }
    return { success: true, post: data ? mapPost(data) : null }
  } catch (error: any) {
    return { success: false, post: null, error: error?.message || 'Could not load blog post.' }
  }
}
