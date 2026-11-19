// API requests are proxied through the client's own domain so the auth
// cookie is stored on this domain (vercel.app is a public suffix, so
// cookies cannot be shared between two of its subdomains directly —
// a direct cross-subdomain call would be a third-party cookie and the
// browser would refuse to keep it).
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const apiUrl = rawApiUrl.replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
