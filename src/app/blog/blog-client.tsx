'use client';

/**
 * Blog Page
 * 
 * Tutorials, tips, and insights about CSS and web development.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  Tag,
  BookOpen,
  Sparkles
} from 'lucide-react';

// Blog posts data
const posts = [
  {
    id: 1,
    title: 'Building Beautiful Buttons with CSS Gradients',
    excerpt: 'Learn how to create stunning gradient buttons that work across all browsers. Includes hover effects and accessibility considerations.',
    author: 'Roy Wanyoike',
    date: 'Dec 10, 2024',
    readTime: '8 min read',
    category: 'Tutorials',
    tags: ['CSS', 'Gradients', 'Buttons'],
    featured: true,
  },
  {
    id: 2,
    title: 'The Complete Guide to Glassmorphism',
    excerpt: 'Everything you need to know about glassmorphism effects, from basic implementation to advanced techniques.',
    author: 'Sarah Chen',
    date: 'Dec 5, 2024',
    readTime: '12 min read',
    category: 'Guides',
    tags: ['Glassmorphism', 'Backdrop Filter', 'Design'],
    featured: false,
  },
  {
    id: 3,
    title: 'CSS Animation Performance Tips',
    excerpt: 'Optimize your CSS animations for smooth 60fps performance. Learn which properties to animate and why.',
    author: 'Marcus Johnson',
    date: 'Nov 28, 2024',
    readTime: '6 min read',
    category: 'Performance',
    tags: ['Animation', 'Performance', 'Best Practices'],
    featured: false,
  },
  {
    id: 4,
    title: 'Creating Accessible Color Schemes',
    excerpt: 'How to choose colors that look great and meet WCAG accessibility standards.',
    author: 'Emily Rodriguez',
    date: 'Nov 20, 2024',
    readTime: '10 min read',
    category: 'Accessibility',
    tags: ['Color', 'Accessibility', 'WCAG'],
    featured: false,
  },
  {
    id: 5,
    title: 'Modern CSS Layout Techniques',
    excerpt: 'Master Grid, Flexbox, and Container Queries for responsive layouts.',
    author: 'Roy Wanyoike',
    date: 'Nov 15, 2024',
    readTime: '15 min read',
    category: 'Layouts',
    tags: ['Grid', 'Flexbox', 'Responsive'],
    featured: false,
  },
  {
    id: 6,
    title: 'CSS Custom Properties Deep Dive',
    excerpt: 'Unlock the full power of CSS variables for theming and dynamic styling.',
    author: 'Sarah Chen',
    date: 'Nov 8, 2024',
    readTime: '9 min read',
    category: 'Advanced',
    tags: ['Variables', 'Theming', 'Custom Properties'],
    featured: false,
  },
];

const categories = ['All', 'Tutorials', 'Guides', 'Performance', 'Accessibility', 'Layouts', 'Advanced'];

export function BlogPageClient() {
  const featuredPost = posts.find(p => p.featured);
  const regularPosts = posts.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
          <Badge variant="secondary" className="mb-4">Blog</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            ROYCSS{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tutorials, tips, and insights about CSS, design, and frontend development.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Post */}
        {featuredPost && (
          <Link href={`/blog/${featuredPost.id}`}>
            <Card className="group overflow-hidden border-primary/20 mb-12 hover:border-primary/40 transition-all duration-300 hover:shadow-xl">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image */}
                <div className="aspect-video md:aspect-auto bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 relative overflow-hidden flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-primary/30" />
                  <Badge className="absolute top-4 left-4">Featured</Badge>
                </div>

                {/* Content */}
                <CardContent className="p-6 md:p-8 flex flex-col justify-center">
                  <Badge variant="outline" className="w-fit mb-3">{featuredPost.category}</Badge>
                  
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {featuredPost.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {featuredPost.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((category) => (
            <Button key={category} variant="outline" size="sm" className="shrink-0">
              {category}
            </Button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full">
                {/* Thumbnail */}
                <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                </div>

                <CardContent className="p-5">
                  <Badge variant="secondary" className="text-[10px] mb-3">{post.category}</Badge>
                  
                  <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.author}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Posts
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default BlogPageClient;
