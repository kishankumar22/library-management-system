import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'http', // Allow http too
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'https', // Allow http too
        hostname: 'travelbookplus.com',
        pathname: '**',
      },
    ],
  },
  
};

export default nextConfig;
