import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // PGlite loads a WASM bundle by filesystem path at runtime. Bundling it
  // rewrites that path into a URL instance that node:fs rejects, so it has
  // to be required natively on the server.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // Thumbnail/poster art is always remote — we host no media (see plan §5).
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
