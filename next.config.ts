import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The voice rules are read from disk at runtime; ship them with the lyrics function.
  outputFileTracingIncludes: {
    "/api/lyrics": ["./rules/**/*"],
    "/api/pronunciation": ["./rules/**/*"],
    "/api/review": ["./rules/**/*"],
    "/api/guide": ["./rules/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
