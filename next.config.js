/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost', 'images.unsplash.com'],
  },
}

module.exports = nextConfig
