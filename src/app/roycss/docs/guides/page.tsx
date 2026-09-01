import type { Metadata } from 'next';
import { GuidesClient } from './guides-client';

export const metadata: Metadata = {
  title: 'Guides - ROYCSS Documentation',
  description: 'Step-by-step guides for common ROYCSS use cases and best practices.',
};

export default function GuidesPage() {
  return <GuidesClient />;
}
