import type { Metadata } from 'next';
import { ROYCSSDashboard } from './dashboard-client';

export const metadata: Metadata = {
  title: 'ROYCSS Dashboard - CSS Effects & Components Library',
  description: 'Access your ROYCSS dashboard to browse 1800+ CSS effects, 500+ components, and design patterns for modern web development.',
  keywords: ['ROYCSS', 'dashboard', 'CSS effects', 'UI components', 'design system'],
  openGraph: {
    title: 'ROYCSS Dashboard',
    description: 'Your hub for beautiful CSS effects and components',
    type: 'website',
  },
};

export default function ROYCSSPage() {
  return <ROYCSSDashboard />;
}
