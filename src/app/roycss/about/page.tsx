import type { Metadata } from 'next';
import { AboutPageClient } from './about-client';

export const metadata: Metadata = {
  title: 'About - ROYCSS',
  description: 'Learn about ROYCSS, our mission, and the team behind the project.',
};

export default function AboutPage() {
  return <AboutPageClient />;
}
