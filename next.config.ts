import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./utils/image-loader.ts",
  },
  outputFileTracingIncludes: {
    "/api/*": ["./node_modules/@img/**"],
  },
};

export default nextConfig;
