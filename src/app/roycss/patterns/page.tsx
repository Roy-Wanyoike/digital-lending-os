import type { Metadata } from 'next';
import { PatternsPageClient } from './patterns-client';

export const metadata: Metadata = {
  title: 'Design Patterns - ROYCSS',
  description: 'Explore reusable design patterns for common UI challenges.',
};

export default function PatternsPage() {
  return <PatternsPageClient />;
}
