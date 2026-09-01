import type { Metadata } from 'next';
import { EffectsPageClient } from './effects-client';

export const metadata: Metadata = {
  title: 'CSS Effects - ROYCSS',
  description: 'Browse 1800+ production-ready CSS effects including hover animations, transitions, gradients, and more.',
  keywords: ['CSS effects', 'animations', 'hover effects', 'transitions', 'CSS library'],
};

export default function EffectsPage() {
  return <EffectsPageClient />;
}
