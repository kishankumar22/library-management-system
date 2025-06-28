import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**', // Allows all paths under res.cloudinary.com
      },
    ],
  },
};

export default nextConfig;