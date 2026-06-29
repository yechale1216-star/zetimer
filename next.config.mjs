/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: isCapacitorBuild ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  turbopack: {},
}

export default nextConfig
