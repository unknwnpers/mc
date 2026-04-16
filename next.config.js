const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
  // Optimize package imports for tree shaking
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Transpile packages that may have ESM/CJS issues
  transpilePackages: ['@upstash/redis'],
  // Turbopack configuration
  turbopack: {},
  // Security headers - fix COOP/COEP for OAuth popup on login page only
  async headers() {
    return [
      {
        source: '/login',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

// Sentry wrapper config
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  silent: true, // Suppresses source map uploading logs during production build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

// Apply Sentry only if DSN is configured
const moduleExports = withBundleAnalyzer(nextConfig);

// Wrap with Sentry if DSN is available
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(moduleExports, sentryWebpackPluginOptions)
  : moduleExports;
