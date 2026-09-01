import type { Metadata } from 'next';
import { DocsPageClient } from './docs-client';
import { Sidebar } from '@/components/roycss/navigation/Sidebar';

export const metadata: Metadata = {
  title: 'Documentation - ROYCSS',
  description: 'Complete documentation for ROYCSS. Learn how to use effects, components, and patterns.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <DocsPageClient />
      </div>
    </div>
  );
}
