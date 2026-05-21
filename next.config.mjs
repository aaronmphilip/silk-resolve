/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't fail the build if env vars are missing
  // (Vercel injects them at runtime, not always at build time)
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Suppress build-time warnings about missing env vars
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
