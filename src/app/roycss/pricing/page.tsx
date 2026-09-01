import type { Metadata } from 'next';
import { PricingPageClient } from './pricing-client';

export const metadata: Metadata = {
  title: 'Pricing - ROYCSS',
  description: 'Choose the right ROYCSS plan for your needs. Free for personal use, Pro for teams.',
};

export default function PricingPage() {
  return <PricingPageClient />;
}
