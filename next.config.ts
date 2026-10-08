import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    loader: "custom",
    loaderFile: "./utils/image-loader.ts",
  },
  // experimental: {
  //   appDir: true,
  // },
};

export default nextConfig;
