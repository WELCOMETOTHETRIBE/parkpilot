/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // Help file tracing pull Prisma engines into standalone (copy-prisma-standalone.js is the main fix)
  experimental: {
    outputFileTracingIncludes: {
      '/api/*': ['./node_modules/.prisma/client/**/*'],
      '/dashboard/*': ['./node_modules/.prisma/client/**/*'],
    },
  },
};

module.exports = nextConfig;
