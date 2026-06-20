/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't fail the build if env vars are missing
  // (Vercel injects them at runtime, not always at build time)
  // Force Next.js to transpile these CJS packages through webpack
  // so EventEmitter and Daily.co load correctly in the browser bundle.
  transpilePackages: ["@vapi-ai/web", "@daily-co/daily-js"],
  serverExternalPackages: ["ws"],
  // Suppress build-time warnings about missing env vars
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/talk/:path*",
        headers: [
          { key: "Permissions-Policy", value: "microphone=(self), autoplay=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
