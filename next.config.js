/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Include /sql directory in the serverless bundle for the migration runner
  outputFileTracingIncludes: {
    '/api/admin/migrate': ['./sql/**/*.sql'],
  },
}

module.exports = nextConfig