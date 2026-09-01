import type { Metadata } from 'next';
import { GettingStartedClient } from './getting-started-client';

export const metadata: Metadata = {
  title: 'Getting Started - ROYCSS Documentation',
  description: 'Get started with ROYCSS in minutes. Installation guide and basic usage examples.',
};

export default function GettingStartedPage() {
  return <GettingStartedClient />;
}
