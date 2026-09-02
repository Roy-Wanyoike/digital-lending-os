import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Terms of Service — Digital Lending OS',
  description: 'Digital Lending OS Terms of Service agreement.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Digital Lending OS (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Digital Lending OS provides a multi-tenant SaaS platform for Kenyan Digital Credit Providers, including CBK-compliant lending, credit scoring, M-Pesa integration, automated collections, and compliance features. The Service is provided &ldquo;as is&rdquo; and is intended for licensed digital credit providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Account Responsibilities</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify Digital Lending OS immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Acceptable Use</h2>
            <p className="text-muted-foreground">
              You agree not to use the Service for any unlawful purpose, including but not limited to money laundering, fraud, or financing of illegal activities. Digital Lending OS reserves the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Digital Lending OS shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service. Our total liability shall not exceed the fees paid by you in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@digitallendingos.co.ke" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                legal@digitallendingos.co.ke
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}