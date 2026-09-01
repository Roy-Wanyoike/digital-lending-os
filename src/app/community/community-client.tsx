'use client';

/**
 * Community Page
 * 
 * Community resources and ways to connect.
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
  MessageSquare,
  Github,
  Twitter,
  Users,
  BookOpen,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Heart,
  Star,
  GitPullRequest
} from 'lucide-react';

// Community resources
const resources = [
  {
    title: 'Discord Server',
    description: 'Join our Discord for real-time chat with the ROYCSS team and community.',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'from-indigo-500 to-purple-500',
    stats: '5,200+ members',
    action: 'Join Discord',
    href: '#',
  },
  {
    title: 'GitHub Discussions',
    description: 'Ask questions, share ideas, and discuss features on GitHub.',
    icon: <Github className="w-6 h-6" />,
    color: 'from-gray-700 to-gray-900',
    stats: '1,800+ discussions',
    action: 'View Discussions',
    href: '#',
  },
  {
    title: 'Twitter/X',
    description: 'Follow us for tips, updates, and community highlights.',
    icon: <Twitter className="w-6 h-6" />,
    color: 'from-sky-400 to-blue-500',
    stats: '12K+ followers',
    action: 'Follow Us',
    href: '#',
  },
];

// How to contribute
const contributeWays = [
  {
    title: 'Report a Bug',
    description: 'Found an issue? Let us know so we can fix it.',
    icon: <HelpCircle className="w-5 h-5" />,
    link: '#bugs',
  },
  {
    title: 'Request a Feature',
    description: 'Have an idea? We\'d love to hear it.',
    icon: <Sparkles className="w-5 h-5" />,
    link: '#features',
  },
  {
    title: 'Submit a PR',
    description: 'Contribute code, docs, or effects directly.',
    icon: <GitPullRequest className="w-5 h-5" />,
    link: '#contribute',
  },
  {
    title: 'Write a Guide',
    description: 'Share your knowledge with tutorials and guides.',
    icon: <BookOpen className="w-5 h-5" />,
    link: '#write',
  },
];

// Community highlights
const highlights = [
  {
    user: 'Sarah K.',
    contribution: 'Created 50+ new button effects pack',
    date: '2 days ago',
    avatar: 'SK',
  },
  {
    user: 'Marcus D.',
    contribution: 'Fixed Safari glassmorphism bug',
    date: '5 days ago',
    avatar: 'MD',
  },
  {
    user: 'Emily R.',
    contribution: 'Wrote accessibility best practices guide',
    date: '1 week ago',
    avatar: 'ER',
  },
];

export function CommunityPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
          <Badge variant="secondary" className="mb-4">Community</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Join Our{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Community</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with thousands of developers who are building beautiful interfaces with ROYCSS.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {/* Community Resources */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-8">Where to Find Us</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card key={resource.title} className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 bg-gradient-to-br text-white",
                    resource.color
                  )}>
                    {resource.icon}
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
                  
                  <Badge variant="secondary" className="mb-4">{resource.stats}</Badge>
                  
                  <Button asChild className="w-full">
                    <a href={resource.href}>
                      {resource.action}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contribute Section */}
        <section className="bg-gradient-to-b from-muted/30 to-background -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Users className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">How to Contribute</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                There are many ways to contribute to ROYCSS. Every contribution matters!
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {contributeWays.map((way) => (
                <Card key={way.title} className="hover:border-primary/20 transition-colors cursor-pointer group">
                  <CardContent className="p-5 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                      {way.icon}
                    </div>
                    <h3 className="font-medium text-sm">{way.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{way.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Community Highlights */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Recent Contributions</h2>
            <Button variant="ghost" size="sm" asChild>
              <a href="#">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </div>

          <div className="space-y-4">
            {highlights.map((highlight) => (
              <Card key={highlight.user} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {highlight.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{highlight.user}</span>{' '}
                      <span className="text-muted-foreground">{highlight.contribution}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{highlight.date}</p>
                  </div>
                  <Heart className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section>
          <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 border-0 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>
            
            <CardContent className="p-8 md:p-12 text-center relative z-10">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Stay in the Loop</h2>
              <p className="text-white/80 max-w-md mx-auto mb-8">
                Get weekly updates on new features, community highlights, and CSS tips.
              </p>
              
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 whitespace-nowrap">
                  Subscribe
                </Button>
              </form>
              
              <p className="text-xs text-white/50 mt-4">
                No spam. Unsubscribe anytime.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CommunityPageClient;
