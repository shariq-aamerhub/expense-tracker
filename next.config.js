/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Increase body size limit for bill image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
