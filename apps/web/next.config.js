/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@amatis/types', '@amatis/shared'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
