import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nqlfzphpistnpouqdmwa.supabase.co",
      },
    ],
  },
};

export default nextConfig;
