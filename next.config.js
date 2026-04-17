const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
    // Optimized device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Optimized image sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimize package imports for tree shaking
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'sonner',
      'date-fns',
    ],
  },
  // Transpile packages that may have ESM/CJS issues
  transpilePackages: ['@upstash/redis'],
  // Turbopack configuration
  turbopack: {},
  // Security headers - fix COOP/COEP for OAuth popup on all pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          // Cache static assets aggressively
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  // Webpack chunk splitting for better caching
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Separate Firebase into its own chunk
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|firebase-admin)[\\/]/,
            name: 'firebase',
            priority: 20,
          },
          // Separate Radix UI into its own chunk
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            priority: 15,
          },
          // Separate lucide-react icons
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide',
            priority: 10,
          },
          // Common vendor chunk
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
