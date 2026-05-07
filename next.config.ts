import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Experimental features for App Router performance
  experimental: {
    // Server Actions are stable in Next.js 15 — no flag needed
    // Partial Pre-rendering for dashboard static shells
    ppr: false, // enable when Vercel PPR is available on your plan
    // Inline CSS for above-the-fold performance
    inlineCss: false,
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Webhook route: allow all origins (Meta calls this from their servers)
      {
        source: '/api/webhooks/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST' },
        ],
      },
    ]
  },

  // Image domains for avatar URLs (Supabase storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Logging for server-side fetch (helps debug in Vercel)
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
}

export default nextConfig
