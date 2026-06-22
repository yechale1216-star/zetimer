/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
}

export default nextConfig
