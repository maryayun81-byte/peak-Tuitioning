import type { NextConfig } from "next";

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: true,
  swcMinify: true,
})

const nextConfig: NextConfig = {
  turbopack: {
    root: './',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default withPWA(nextConfig);
