import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/export/',
        '/test-connection',
        // Short-link resolver: every URL 302s off-site and adds nothing to
        // the index. Not disallowed: /admin/, /student/, /teacher/,
        // /parent/, /finance/ — those segments now emit `noindex`, which
        // crawlers can only honour if they are allowed to fetch the page.
        '/r/',
      ],
    },
    sitemap: 'https://www.peakcampus.co.ke/sitemap.xml',
  };
}
