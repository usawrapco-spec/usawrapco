export const dynamic = 'force-dynamic'

import DesignMockupWizard from '@/components/portal/DesignMockupWizard'

export const metadata = {
  title: 'AI Wrap Design Generator — USA WRAP CO',
  description: 'See your vehicle wrap before you commit. AI-powered mockup generator with professional designer refinement.',
}

export default function PortalDesignPage() {
  return <DesignMockupWizard />
}
