'use client';

/**
 * About Page
 * 
 * About ROYCSS, mission, and team information.
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
  Sparkles,
  Heart,
  Users,
  Github,
  Twitter,
  Linkedin,
  Globe,
  Target,
  Lightbulb,
  Rocket,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

// Team members (placeholder data)
const team = [
  { name: 'Roy Wanyoike', role: 'Founder & Lead Developer', avatar: 'RW' },
  { name: 'Sarah Chen', role: 'Design Systems Engineer', avatar: 'SC' },
  { name: 'Marcus Johnson', role: 'Frontend Developer', avatar: 'MJ' },
];

// Values
const values = [
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Developer First',
    description: 'Built by developers, for developers. We prioritize developer experience above all.',
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: 'Innovation',
    description: 'Pushing the boundaries of what\'s possible with CSS and modern web technologies.',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Open Source',
    description: 'Committed to open source. Our core library will always be free and open.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Community',
    description: 'Building a supportive community where everyone can learn and grow together.',
  },
];

// Timeline milestones
const timeline = [
  { year: '2023', event: 'ROYCSS project started as a personal collection of CSS snippets.' },
  { year: '2024 Q1', event: 'Public beta launch with 500+ effects and components.' },
  { year: '2024 Q2', event: 'Reached 10,000 GitHub stars and 5,000 npm weekly downloads.' },
  { year: '2024 Q3', event: 'Launched v2.0 with React components and TypeScript support.' },
  { year: '2024 Q4', event: '50,000+ developers using ROYCSS worldwide.' },
];

export function AboutPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
          <Badge variant="secondary" className="mb-4">About</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Building the Future of{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CSS Design</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            ROYCSS is on a mission to make beautiful UI accessible to every developer.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mt-12">
            {[
              { value: '50K+', label: 'Developers' },
              { value: '1800+', label: 'Effects' },
              { value: '500+', label: 'Components' },
              { value: '100%', label: 'Open Source' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {/* Mission Section */}
        <section className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We believe that every developer deserves access to high-quality design resources. 
              ROYCSS exists to bridge the gap between design and development, making it easy 
              to create stunning interfaces without being a design expert.
            </p>
            <p className="text-muted-foreground mb-8">
              Whether you&apos;re building a side project or an enterprise application, 
              ROYCSS provides the tools you need to ship beautiful UI faster.
            </p>
            <Button size="lg" asChild>
              <Link href="/roycss/docs/getting-started">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-primary/20 p-8">
            <CardContent className="p-0 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
              <blockquote className="text-lg italic text-foreground/80">
                &ldquo;Beautiful code should produce beautiful results.&rdquo;
              </blockquote>
              <p className="text-sm text-muted-foreground mt-4">— Roy Wanyoike, Founder</p>
            </CardContent>
          </Card>
        </section>

        {/* Values Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at ROYCSS.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4">
                    {value.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Key milestones in the ROYCSS story.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {timeline.map((item, index) => (
              <div key={index} className="flex gap-6 pb-8 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                    {item.year.slice(-2)}
                  </div>
                  {index !== timeline.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="pb-4">
                  <Badge variant="secondary" className="mb-2">{item.year}</Badge>
                  <p className="text-muted-foreground">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet the Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind ROYCSS.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {team.map((member) => (
              <Card key={member.name} className="text-center hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                    {member.avatar}
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Github className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Linkedin className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 border-0 text-white overflow-hidden">
            <CardContent className="p-12 relative">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <Rocket className="w-12 h-12 mx-auto mb-4 opacity-80" />
                <h2 className="text-3xl font-bold mb-4">Ready to Join Us?</h2>
                <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                  Start using ROYCSS today and see why thousands of developers love it.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100" asChild>
                    <Link href="/roycss/docs/getting-started">
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                    <a href="https://github.com/Roy-Wanyoike/digital-lending-os" target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      Star on GitHub
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AboutPageClient;
