import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Privacy Policy — Youngsend',
  description: 'Youngsend Privacy Policy explaining how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly (name, email, business details), transaction data, device information, and usage analytics. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Your Data</h2>
            <p className="text-muted-foreground">
              Your data is used to provide and improve the Service, process transactions, comply with legal obligations (including KYC/AML regulations), prevent fraud, and communicate with you about your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Data Security</h2>
            <p className="text-muted-foreground">
              We employ bank-grade encryption (AES-256 at rest, TLS 1.3 in transit), SOC 2 compliant infrastructure, and regular security audits to protect your data. Access is restricted on a need-to-know basis with full audit logging.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active or as needed to provide services. Transaction records are retained for a minimum of 5 years to comply with financial regulations. You may request deletion of non-regulatory data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal data. You may also request data portability and object to certain processing activities. To exercise these rights, contact our Data Protection Officer.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Third-Party Services</h2>
            <p className="text-muted-foreground">
              We integrate with payment processors (e.g., Stripe, Paystack, Flutterwave) to facilitate transactions. Each processor operates under their own privacy policy. We share only the minimum data necessary to process payments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@youngsend.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                privacy@youngsend.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}