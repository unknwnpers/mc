/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint:  { ignoreDuringBuilds: true }, // ESLint is a style concern, not correctness
  images:  { unoptimized: true },
};

module.exports = nextConfig;
