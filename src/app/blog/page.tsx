import type { Metadata } from 'next';
import { BlogPageClient } from './blog-client';

export const metadata: Metadata = {
  title: 'Blog - ROYCSS',
  description: 'Tutorials, tips, and insights about CSS, web design, and frontend development.',
};

export default function BlogPage() {
  return <BlogPageClient />;
}
