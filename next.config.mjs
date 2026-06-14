/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next_dev_v2',
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.133', '192.168.1.3'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ]
  },
  onDemandEntries: {
    // Keep pages in memory for 1 hour
    maxInactiveAge: 3600 * 1000,
    // Buffer more pages
    pagesBufferLength: 100,
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  reactStrictMode: false, // Disable strict mode in dev to reduce double-loading of chunks
}

export default nextConfig
