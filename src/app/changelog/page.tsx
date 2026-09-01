import type { Metadata } from 'next';
import { ChangelogPageClient } from './changelog-client';

export const metadata: Metadata = {
  title: 'Changelog - ROYCSS',
  description: 'See what\'s new in ROYCSS. Track all updates, improvements, and bug fixes.',
};

export default function ChangelogPage() {
  return <ChangelogPageClient />;
}
