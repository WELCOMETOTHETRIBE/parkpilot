/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable static optimization to ensure all pages are rendered dynamically
  experimental: {
    dynamicIO: true,
  },
};

module.exports = nextConfig;
