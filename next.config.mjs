/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      // Marketplace listing photos, served from the public
      // marketplace-listing-photos Supabase Storage bucket (029_marketplace_schema.sql).
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // Prevents Next.js from serving a stale cached snapshot of dynamic
    // pages (parent/teacher dashboards, settings) after data changes —
    // without this, adding a child or a book can appear to "disappear"
    // when navigating back to a page within ~30s of the change.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;