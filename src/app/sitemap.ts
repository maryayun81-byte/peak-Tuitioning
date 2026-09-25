import { MetadataRoute } from 'next';

// Fixed, content-accurate lastmod values instead of "now". Shipping
// `new Date()` for every URL made Google see the whole site change on each
// deploy, which wastes recrawl budget and dilutes lastmod as a signal.
// These dates come from the last commit that touched each page's source.
const STATIC_ROUTES: Array<{
  path: string;
  lastModified: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', lastModified: '2026-09-20', changeFrequency: 'daily', priority: 1 },
  { path: '/kcse-and-cbc-tutoring-kenya', lastModified: '2026-06-28', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/holiday-tuition-kenya', lastModified: '2026-06-28', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/tuition-center-nairobi', lastModified: '2026-06-28', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/blog', lastModified: '2026-06-30', changeFrequency: 'daily', priority: 0.85 },
  { path: '/events/register', lastModified: '2026-09-14', changeFrequency: 'weekly', priority: 0.85 },
  { path: '/about', lastModified: '2026-09-09', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', lastModified: '2026-09-09', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', lastModified: '2026-09-14', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', lastModified: '2026-09-14', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', lastModified: '2026-09-14', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.peakcampus.co.ke';

  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Published blog articles as indexable URLs. Best-effort: if the database
  // is unreachable at build time, the static routes above still ship and the
  // build never fails.
  try {
    const { getPublicBlogPosts } = await import('@/app/actions/blog');
    const result = await getPublicBlogPosts(100);
    if (result.success && result.posts.length > 0) {
      const articleRoutes: MetadataRoute.Sitemap = result.posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date('2026-06-30'),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
      return [...staticRoutes, ...articleRoutes];
    }
  } catch {
    // Fall through to static routes only.
  }

  return staticRoutes;
}
