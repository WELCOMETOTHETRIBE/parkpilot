/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure pages are properly built and served
  output: 'standalone',
  // Ensure Next.js uses PORT from environment (Railway provides this)
  // Next.js automatically uses process.env.PORT if set, but we'll be explicit
};

module.exports = nextConfig;
