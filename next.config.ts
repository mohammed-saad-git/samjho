import type { NextConfig } from 'next';
import { validateFrontendEnv } from './lib/env';

const isDev = process.env.NODE_ENV === 'development';
const isProductionBuild =
  process.env.npm_lifecycle_event === 'build' || process.argv.includes('build');

if (isProductionBuild) {
  validateFrontendEnv();
}

function getSupabaseConnectOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const supabaseConnectOrigin = getSupabaseConnectOrigin();
const connectSrc = [
  "connect-src 'self'",
  supabaseConnectOrigin,
  'https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321 https://cdn.jsdelivr.net https://tessdata.projectnaptha.com blob: data:',
]
  .filter(Boolean)
  .join(' ');

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  connectSrc,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
