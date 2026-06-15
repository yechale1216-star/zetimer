/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
}

export default nextConfig
