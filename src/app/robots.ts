import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/student/', '/teacher/', '/parent/', '/finance/', '/dashboard/'],
    },
    sitemap: 'https://www.peakcampus.co.ke/sitemap.xml',
  };
}
