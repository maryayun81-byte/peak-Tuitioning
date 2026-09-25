import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BlogArticleExperience } from '@/components/blog/BlogArticleExperience'
import { getPublicBlogPostBySlug, getPublicBlogPosts } from '@/app/actions/blog'
import { breadcrumbJsonLd } from '@/lib/seo/breadcrumbs'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getPublicBlogPostBySlug(slug)
  if (!result.post) return { title: { absolute: 'Peak Performance Blog' } }
  return {
    // `absolute` stops the root template from producing
    // "Article | Peak Performance Blog | Peak Performance Tutoring".
    title: { absolute: `${result.post.title} | Peak Performance Tutoring` },
    description: result.post.excerpt,
    alternates: { canonical: `/blog/${result.post.slug}` },
    openGraph: {
      title: result.post.title,
      description: result.post.excerpt,
      images: result.post.coverImageUrl ? [result.post.coverImageUrl] : undefined,
    },
  }
}

// Blog articles previously linked only to each other, so link equity never
// reached the service pages that actually rank. These sit below the article
// and are plain server-rendered anchors.
const relatedProgrammes = [
  {
    label: 'Holiday Tuition in Kenya',
    href: '/holiday-tuition-kenya',
    desc: 'April, August and December revision programmes for KCSE and CBC.',
  },
  {
    label: 'KCSE & CBC Tutoring',
    href: '/kcse-and-cbc-tutoring-kenya',
    desc: 'Term-time tutoring built around a diagnostic-first plan.',
  },
  {
    label: 'Tuition Centre in Nairobi',
    href: '/tuition-center-nairobi',
    desc: 'The Kinoo hub where placement and diagnostics happen.',
  },
  {
    label: 'Contact Peak Performance Tutoring',
    href: '/contact',
    desc: 'Call 0798971625, WhatsApp, or get directions.',
  },
]

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const result = await getPublicBlogPostBySlug(slug)
  const post = result.post
  if (!post) notFound()

  const relatedResult = await getPublicBlogPosts(6)
  const relatedPosts = (relatedResult.posts || [])
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3)

  const pageJsonLd = breadcrumbJsonLd([
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <BlogArticleExperience post={post} relatedPosts={relatedPosts} />

      <section className="border-t border-[#145da0]/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Related programmes</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[#073159] sm:text-4xl">
            Put the advice into a programme.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProgrammes.map(({ label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col justify-between rounded-lg border border-[#145da0]/10 bg-[#f8f6f1] p-5 transition hover:border-[#145da0]/40 hover:bg-white"
              >
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[#073159]">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#145da0]">
                  View programme <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
