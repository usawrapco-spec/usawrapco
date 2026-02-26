/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize images from Supabase Storage and other sources
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uqfqkvslxoucxmxxrobt.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Include /sql directory in the serverless bundle for the migration runner
  outputFileTracingIncludes: {
    '/api/admin/migrate': ['./sql/**/*.sql'],
  },
  // Treat heavy SDK packages as external so they are required at runtime,
  // not bundled+evaluated during Next.js build page-data collection.
  // This prevents the Anthropic SDK module-level constructor from running
  // during `next build` and corrupting the pages-manifest.json on Windows.
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'twilio', 'replicate'],
  },
}

module.exports = nextConfig