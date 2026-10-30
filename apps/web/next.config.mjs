import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.env.NEXT_TELEMETRY_DISABLED = "1";
// The web workspace and CLI scripts share the documented root environment file.
for (const name of ["../../.env.local", "../../.env"]) {
  const path = fileURLToPath(new URL(name, import.meta.url));
  if (existsSync(path)) process.loadEnvFile(path);
}
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.CHAMBI_E2E === "true" ? ".next-e2e" : ".next",
  typescript: {
    tsconfigPath: process.env.CHAMBI_E2E === "true" ? "tsconfig.e2e.json" : "tsconfig.json",
  },
  logging: { incomingRequests: { ignore: [/^\/t\//] } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
