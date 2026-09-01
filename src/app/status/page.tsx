import type { Metadata } from 'next';
import { StatusPageClient } from './status-client';

export const metadata: Metadata = {
  title: 'System Status - ROYCSS',
  description: 'Monitor the status of ROYCSS services and infrastructure.',
};

export default function StatusPage() {
  return <StatusPageClient />;
}
