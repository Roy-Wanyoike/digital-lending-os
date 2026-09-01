import type { Metadata } from 'next';
import { ComponentsPageClient } from './components-client';

export const metadata: Metadata = {
  title: 'UI Components - ROYCSS',
  description: 'Browse 500+ production-ready UI components including buttons, cards, forms, modals, and more.',
};

export default function ComponentsPage() {
  return <ComponentsPageClient />;
}
