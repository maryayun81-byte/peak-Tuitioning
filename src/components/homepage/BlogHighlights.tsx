'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImageUrl: string
  category: string
  authorName: string
  readMinutes: number
  publishedAt: string | null
}

export function BlogHighlights() {
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { getPublicBlogPosts } = await import('@/app/actions/blog')
        const result = await getPublicBlogPosts(6)
        if (result.success) {
          // Deduplicate by id
          const seen = new Set<string>()
          const unique = result.posts.filter((p: BlogPost) => {
            if (seen.has(p.id)) return false
            seen.add(p.id)
            return true
          })
          setPosts(unique)
        }
      } catch (err) {
        console.error('Failed to fetch blog posts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isPaused || posts.length <= 1) return

    let animId: number
    let lastTime = performance.now()
    const speed = 0.3 // px per ms

    const tick = (now: number) => {
      const dt = now - lastTime
      lastTime = now
      el.scrollLeft += speed * dt

      // Loop back when near end
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
        el.scrollLeft = 0
      }
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [isPaused, posts.length])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
  }

  const scrollBy = useCallback((dir: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }, [])

  return (
    <section id="blog" ref={ref} className="relative py-12 md:py-16 bg-white">
      <div className="landing-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <span className="peak-label peak-label-blue mb-3 block">FROM THE BLOG</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Latest Insights
            </h2>
          </div>
          {posts.length > 2 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scrollBy(-1)}
                className="w-9 h-9 rounded-full border border-slate-200 hover:border-peak-green hover:text-peak-green flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={() => scrollBy(1)}
                className="w-9 h-9 rounded-full border border-slate-200 hover:border-peak-green hover:text-peak-green flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 animate-pulse rounded-xl overflow-hidden">
                <div className="h-40 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No blog posts yet. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Horizontal scroll row */}
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto hide-scrollbar pb-2 -mx-6 px-6 snap-x snap-mandatory"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {posts.map((post, i) => (
                <div key={post.id} className="flex-shrink-0 w-72 snap-start">
                  <BlogCard post={post} formatDate={formatDate} />
                </div>
              ))}
            </div>

            {/* View all */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="text-center mt-8"
            >
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-peak-green font-bold text-sm hover:gap-3 transition-all"
              >
                View All Posts
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </section>
  )
}

function BlogCard({ post, formatDate }: { post: BlogPost; formatDate: (d: string | null) => string }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full rounded-xl overflow-hidden border border-slate-200 hover:border-peak-green/30 hover:shadow-lg transition-all duration-300 bg-white"
    >
      <div className="h-40 bg-slate-100 overflow-hidden relative">
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-peak-green/10 to-peak-blue/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-peak-green rounded-full text-[10px] font-bold uppercase tracking-wider border border-peak-green/20">
            {post.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-peak-green transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{post.excerpt}</p>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{post.authorName}</span>
          <span>{formatDate(post.publishedAt)}</span>
        </div>
      </div>
    </Link>
  )
}