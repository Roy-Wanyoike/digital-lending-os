import type { Metadata } from 'next';
import { CommunityPageClient } from './community-client';

export const metadata: Metadata = {
  title: 'Community - ROYCSS',
  description: 'Join the ROYCSS community. Connect with other developers, share your work, and get help.',
};

export default function CommunityPage() {
  return <CommunityPageClient />;
}
