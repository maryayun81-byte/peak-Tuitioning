import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock3, Newspaper, SearchCheck } from 'lucide-react'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import { getPublicBlogPosts } from '@/app/actions/blog'

export const metadata: Metadata = {
  title: 'Peak Performance Blog | KCSE, CBC & Holiday Tuition Insights',
  description: 'Read Peak Performance Tutoring insights for KCSE revision, CBC learning, holiday tuition, study strategy and parent decision-making in Kenya.',
  alternates: { canonical: '/blog' },
}

type BlogPageProps = {
  searchParams?: Promise<{ filter?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const activeFilter = params?.filter === 'older' || params?.filter === 'all' ? params.filter : 'latest'
  const result = await getPublicBlogPosts(24)
  const posts = result.success ? result.posts : []
  const [featured, ...rest] = posts
  const latestNews = posts.slice(0, 3)
  const filteredPosts = activeFilter === 'older'
    ? posts.slice(3)
    : activeFilter === 'all'
      ? posts
      : posts.slice(0, 9)

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#073159]">
      <header className="relative z-[160] border-b border-[#145da0]/10 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-[#073159]">
            <span className="h-10 w-10 overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(7,49,89,0.18)] ring-1 ring-[#145da0]/10">
              <img src="/logo.png" alt="Peak Performance logo" className="h-full w-full object-cover" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.14em]">Peak Performance</span>
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#145da0]">Tutoring</span>
            </span>
          </Link>
          <PublicPortalMenu />
        </div>
      </header>

      <section className="relative z-0 overflow-hidden bg-[#073159] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(126,217,87,.16),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/80 transition hover:border-[#7ed957]/60 hover:bg-white/15 hover:text-white">
              <ArrowLeft size={14} /> Back home
            </Link>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#bff8a7]">
              <Newspaper size={14} /> Peak insights
            </p>
          </div>
          <h1 className="mt-4 max-w-2xl text-2xl font-black leading-tight sm:text-4xl">Peak insights for sharper learning decisions.</h1>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/68 lg:justify-self-end sm:text-base">KCSE, CBC, holiday tuition and study strategy notes for Kenyan families.</p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {featured ? (
            <Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-[1.5rem] border border-[#145da0]/10 bg-white shadow-[0_18px_55px_rgba(7,49,89,0.1)] md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-[280px]">
                {featured.coverImageUrl ? <img src={featured.coverImageUrl} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[#073159]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/24 to-transparent" />
              </div>
              <div className="flex flex-col justify-center p-6 md:p-8">
                <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#eaf3f8] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#145da0]">
                  <SearchCheck size={14} /> Featured
                </div>
                <h2 className="text-2xl font-black leading-tight sm:text-3xl">{featured.title}</h2>
                <div className="relative mt-4 max-h-[5.25rem] overflow-hidden">
                  <p className="text-sm leading-7 text-slate-600">{featured.excerpt}</p>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white to-white/0" />
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  <span>{featured.category}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {featured.readMinutes} min</span>
                </div>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#145da0]">Read article <ArrowRight size={16} /></span>
              </div>
            </Link>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[#145da0]/20 bg-white p-12 text-center font-bold text-slate-500">Peak insights are coming soon.</div>
          )}

          {latestNews.length > 0 && (
            <div className="mt-8 rounded-[1.5rem] border border-[#145da0]/10 bg-[#073159] p-4 text-white shadow-[0_18px_55px_rgba(7,49,89,0.12)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7ed957]">Latest news</p>
                  <h2 className="mt-1 text-xl font-black">Fresh from Peak</h2>
                </div>
                <Link href="/blog?filter=latest" className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/76 sm:inline-flex">Newest first</Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {latestNews.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group rounded-2xl border border-white/10 bg-white/8 p-4 transition hover:-translate-y-1 hover:bg-white/12">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a5ef87]">{post.category}</div>
                    <h3 className="mt-2 line-clamp-2 text-base font-black leading-tight">{post.title}</h3>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                      <Clock3 size={12} /> {post.readMinutes} min read
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {posts.length > 0 && (
            <div className="mt-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#145da0]">Browse articles</p>
                <h2 className="mt-1 text-2xl font-black text-[#073159]">{activeFilter === 'older' ? 'Older insights' : activeFilter === 'all' ? 'All articles' : 'Latest articles'}</h2>
              </div>
              <div className="flex rounded-full border border-[#145da0]/10 bg-white p-1 shadow-sm">
                {[
                  ['latest', 'Latest'],
                  ['older', 'Older'],
                  ['all', 'All'],
                ].map(([value, label]) => (
                  <Link
                    key={value}
                    href={`/blog?filter=${value}`}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${activeFilter === value ? 'bg-[#073159] text-white' : 'text-[#145da0] hover:bg-[#eaf3f8]'}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredPosts.length > 0 && (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {filteredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-[1.25rem] border border-[#145da0]/10 bg-white shadow-[0_14px_40px_rgba(7,49,89,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(7,49,89,0.14)]">
                  <div className="relative h-48 bg-[#073159]">
                    {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/32 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/94 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#145da0] shadow-sm">{post.category}</div>
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-lg font-black leading-tight">{post.title}</h3>
                    <div className="relative mt-3 h-[4.5rem] overflow-hidden">
                      <p className="text-sm leading-6 text-slate-600">{post.excerpt}</p>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-white/0" />
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      <span>{post.readMinutes} min</span>
                      <span className="text-[#145da0]">Read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {posts.length > 0 && filteredPosts.length === 0 && (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#145da0]/20 bg-white p-10 text-center text-sm font-bold text-slate-500">
              No older posts yet. New articles will move here as the blog grows.
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
