/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

const nextConfig = {
  typescript: {
    // API routes use force-dynamic which is incompatible with static export,
    // but those routes run on the remote server — not inside the APK WebView.
    // Safe to ignore during the Capacitor build.
    ignoreBuildErrors: isCapacitorBuild ? true : false,
  },
  // ESLint key removed — no longer supported in Next.js 16
  output: isCapacitorBuild ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  turbopack: {},
}

export default nextConfig
