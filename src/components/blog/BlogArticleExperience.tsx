'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import type { MarketingBlogPost } from '@/app/actions/blog'

type BlogArticleExperienceProps = {
  post: MarketingBlogPost
  relatedPosts: MarketingBlogPost[]
}

type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'faq'; question: string; answer: string }
  | { type: 'paragraph'; text: string }

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
}

function formatDate(value: string | null) {
  return new Date(value || Date.now()).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function parseArticleContent(content: string) {
  const parts = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  const blocks: ContentBlock[] = []
  const faqs: Array<{ question: string; answer: string }> = []

  parts.forEach((part) => {
    if (part.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 2, text: part.replace(/^#\s*/, '') })
      return
    }

    if (part.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 3, text: part.replace(/^##\s*/, '') })
      return
    }

    if (part.startsWith('>')) {
      blocks.push({ type: 'quote', text: part.replace(/^>\s*/, '') })
      return
    }

    if (/^(faq|q):/i.test(part)) {
      const lines = part.split('\n').map((line) => line.trim()).filter(Boolean)
      const question = lines[0]?.replace(/^(faq|q):\s*/i, '') || ''
      const answer = lines.slice(1).join(' ').replace(/^a:\s*/i, '')
      if (question && answer) {
        const faq = { question, answer }
        blocks.push({ type: 'faq', ...faq })
        faqs.push(faq)
        return
      }
    }

    if (part.startsWith('- ')) {
      blocks.push({
        type: 'list',
        items: part
          .split('\n')
          .map((item) => item.replace(/^-\s*/, '').trim())
          .filter(Boolean),
      })
      return
    }

    blocks.push({ type: 'paragraph', text: part })
  })

  return { blocks, faqs }
}

export function BlogArticleExperience({ post, relatedPosts }: BlogArticleExperienceProps) {
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const { blocks, faqs } = useMemo(() => parseArticleContent(post.content), [post.content])
  const firstParagraphIndex = useMemo(() => blocks.findIndex((block) => block.type === 'paragraph'), [blocks])
  const publishDate = formatDate(post.publishedAt || post.createdAt)

  useEffect(() => {
    const updateProgress = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0)
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  const copyArticleLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#073159]">
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      )}
      <div className="fixed left-0 top-0 z-[230] h-1 bg-[#7ed957] shadow-[0_0_18px_rgba(126,217,87,0.8)] transition-[width] duration-150" style={{ width: `${progress}%` }} />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-[160] border-b border-[#145da0]/10 bg-white/95 px-4 py-4 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-[#073159]">
            <span className="h-10 w-10 overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(7,49,89,0.18)] ring-1 ring-[#145da0]/10">
              <img src="/logo.png" alt="Peak Performance logo" className="h-full w-full object-cover" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.14em]">Peak Performance</span>
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#145da0]">Editorial</span>
            </span>
          </Link>
          <PublicPortalMenu />
        </div>
      </motion.header>

      <article>
        <section className="relative z-0 overflow-hidden bg-[#073159] text-white">
          <div className="absolute inset-0">
            {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-[#041526]/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041526] via-[#041526]/72 to-[#041526]/20" />
          </div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8"
          >
            <motion.nav variants={fadeUp} className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/62">
              <Link href="/" className="transition hover:text-[#7ed957]">Home</Link>
              <span>/</span>
              <Link href="/blog" className="transition hover:text-[#7ed957]">Blog</Link>
              <span>/</span>
              <span className="max-w-[280px] truncate text-[#7ed957] sm:max-w-md">{post.title}</span>
            </motion.nav>

            <motion.div variants={fadeUp} className="mt-8 inline-flex rounded-full bg-[#7ed957] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#073159]">
              {post.category}
            </motion.div>
            <motion.h1 variants={fadeUp} className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {post.title}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
              {post.excerpt}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"><CalendarDays size={16} /> {publishDate}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"><Clock3 size={16} /> {post.readMinutes} min read</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"><UserRound size={16} /> {post.authorName}</span>
            </motion.div>
          </motion.div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_320px]">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_55px_rgba(7,49,89,0.08)]"
            >
              <div className="border-b border-[#145da0]/10 bg-[#f8fbfd] p-5 sm:p-7">
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#145da0] transition hover:text-[#073159]">
                  <ArrowLeft size={16} />
                  Back to Peak insights
                </Link>
                <div className="mt-5 grid gap-3 rounded-2xl border border-[#7ed957]/35 bg-[#edffe5] p-4 text-[#073159] sm:grid-cols-[auto_1fr] sm:items-start">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#073159] text-[#7ed957]">
                    <BookOpenCheck size={21} />
                  </span>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[#145da0]">Peak editorial note</p>
                    <p className="mt-1 text-sm leading-6 text-[#073159]/76">
                      This article is written to help parents and learners make sharper academic decisions, not just read another school update.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-7 p-6 sm:p-9">
                {blocks.map((block, index) => {
                  if (block.type === 'heading') {
                    const Heading = block.level === 2 ? 'h2' : 'h3'
                    return (
                      <Heading key={`${block.type}-${index}`} className={block.level === 2 ? 'pt-3 text-2xl font-black tracking-tight text-[#073159] sm:text-3xl' : 'pt-2 text-xl font-black tracking-tight text-[#145da0] sm:text-2xl'}>
                        {block.text}
                      </Heading>
                    )
                  }

                  if (block.type === 'quote') {
                    return (
                      <blockquote key={`${block.type}-${index}`} className="rounded-2xl border-l-4 border-[#7ed957] bg-[#073159] p-5 text-lg font-black leading-8 text-white shadow-[0_14px_40px_rgba(7,49,89,0.14)]">
                        {block.text}
                      </blockquote>
                    )
                  }

                  if (block.type === 'list') {
                    return (
                      <ul key={`${block.type}-${index}`} className="grid gap-3 rounded-2xl border border-[#145da0]/10 bg-[#f8fbfd] p-5">
                        {block.items.map((item, itemIndex) => (
                          <li key={`${item}-${itemIndex}`} className="flex gap-3 text-[16px] leading-7 text-slate-700">
                            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#145da0]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  }

                  if (block.type === 'faq') {
                    return (
                      <div key={`${block.type}-${index}`} className="rounded-2xl border border-[#145da0]/12 bg-[#f4f9fc] p-5">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#145da0] shadow-sm">
                            <HelpCircle size={20} />
                          </span>
                          <div>
                            <h3 className="text-lg font-black text-[#073159]">{block.question}</h3>
                            <p className="mt-2 text-[16px] leading-8 text-slate-700">{block.answer}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <p
                      key={`${block.type}-${index}`}
                      className={`text-[17px] leading-8 text-slate-700 ${index === firstParagraphIndex ? 'first-letter:mr-1 first-letter:text-5xl first-letter:font-black first-letter:text-[#145da0]' : ''}`}
                    >
                      {block.text}
                    </p>
                  )
                })}

                {faqs.length === 0 && (
                  <div className="rounded-2xl border border-[#145da0]/10 bg-[#f8fbfd] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#145da0]">Quick parent takeaway</p>
                    <p className="mt-2 text-[16px] leading-8 text-slate-700">
                      The strongest tuition decisions are made early: identify the learner's weak areas, place them in the right class track, and keep feedback visible until performance changes.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
              className="h-fit space-y-4 lg:sticky lg:top-24"
            >
              <div className="rounded-[1.5rem] bg-[#073159] p-5 text-white shadow-[0_20px_60px_rgba(7,49,89,0.16)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#7ed957]">
                    <GraduationCap size={23} />
                  </span>
                  <div>
                    <p className="text-sm font-black">Peak Editorial</p>
                    <p className="text-xs font-bold text-white/55">{post.authorName}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-black text-white/75">
                  <span className="rounded-2xl bg-white/10 px-3 py-2">{post.category}</span>
                  <span className="rounded-2xl bg-white/10 px-3 py-2">{post.readMinutes} min read</span>
                </div>
                <p className="mt-5 text-sm leading-6 text-white/68">
                  Share this with a parent, student or teacher who needs a clearer next academic move.
                </p>
                <button
                  type="button"
                  onClick={copyArticleLink}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white hover:text-[#073159]"
                >
                  <Copy size={16} />
                  {copied ? 'Link copied' : 'Copy article link'}
                </button>
                <Link href="/events/register" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7ed957] px-4 py-3 text-sm font-black text-[#073159] transition hover:-translate-y-0.5">
                  Register for tuition
                  <ArrowRight size={16} />
                </Link>
              </div>

              <Link href="https://wa.me/254798971625" className="flex items-center gap-3 rounded-[1.25rem] border border-[#145da0]/10 bg-white p-4 shadow-[0_14px_40px_rgba(7,49,89,0.08)] transition hover:-translate-y-0.5 hover:border-[#7ed957]/60">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edffe5] text-[#145da0]">
                  <MessageCircle size={21} />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#073159]">Talk to Peak</span>
                  <span className="mt-0.5 block text-xs font-bold text-slate-500">Ask about placement or fees</span>
                </span>
              </Link>
            </motion.aside>
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="px-4 pb-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#145da0]">Read next</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#073159] sm:text-3xl">Related Peak insights</h2>
                </div>
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#145da0] transition hover:text-[#073159]">
                  All articles
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {relatedPosts.map((item, index) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="group overflow-hidden rounded-[1.4rem] border border-[#145da0]/10 bg-white shadow-[0_14px_44px_rgba(7,49,89,0.08)]"
                  >
                    <Link href={`/blog/${item.slug}`} className="block">
                      <div className="relative h-40 overflow-hidden bg-[#073159]">
                        {item.coverImageUrl && <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#041526]/72 to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-[#7ed957] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#073159]">{item.category}</span>
                      </div>
                      <div className="p-5">
                        <h3 className="line-clamp-2 text-lg font-black leading-tight text-[#073159]">{item.title}</h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.excerpt}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#145da0]">
                          Read article
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
