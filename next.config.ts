import type { NextConfig } from "next";

const defaultRuntimeCaching = require("next-pwa/cache");

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
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
