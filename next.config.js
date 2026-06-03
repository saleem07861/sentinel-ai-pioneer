/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the Prisma client and the pg driver out of the bundler so they run
  // as normal Node modules in server route handlers.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "pdf-parse", "mammoth"],
  },
  // No ESLint config is set up for this demo; don't block the production build on it.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
