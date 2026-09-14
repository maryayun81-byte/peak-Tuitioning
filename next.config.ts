import type { NextConfig } from "next";

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: true,
  swcMinify: true,
})

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.13'],
  serverExternalPackages: ['jsdom'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://vqgdnjdtourtxmlmxuga.supabase.co https://cdn.pixabay.com https://www.transparenttextures.com https://upload.wikimedia.org https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://www.facebook.com https://www.google-analytics.com https://googleads.g.doubleclick.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vqgdnjdtourtxmlmxuga.supabase.co https://*.posthog.com https://*.livekit.cloud wss://*.livekit.cloud https://www.facebook.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://region1.google-analytics.com https://*.google-analytics.com; media-src 'self' blob: mediastream:; frame-src https://www.youtube.com https://player.vimeo.com; frame-ancestors 'none';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
