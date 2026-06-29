import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticleExperience } from '@/components/blog/BlogArticleExperience'
import { getPublicBlogPostBySlug, getPublicBlogPosts } from '@/app/actions/blog'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getPublicBlogPostBySlug(slug)
  if (!result.post) return { title: 'Peak Blog Article' }
  return {
    title: `${result.post.title} | Peak Performance Blog`,
    description: result.post.excerpt,
    alternates: { canonical: `/blog/${result.post.slug}` },
    openGraph: {
      title: result.post.title,
      description: result.post.excerpt,
      images: result.post.coverImageUrl ? [result.post.coverImageUrl] : undefined,
    },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const result = await getPublicBlogPostBySlug(slug)
  const post = result.post
  if (!post) notFound()

  const relatedResult = await getPublicBlogPosts(6)
  const relatedPosts = (relatedResult.posts || [])
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3)

  return <BlogArticleExperience post={post} relatedPosts={relatedPosts} />
}
