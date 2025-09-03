/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CUSTOM_KEY: 'boombank-secret-key',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
