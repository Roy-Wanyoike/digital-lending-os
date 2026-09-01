'use client';

/**
 * ROYCSS Homepage
 * 
 * Dual-purpose landing page for visitors and dashboard entry for logged-in users.
 * Features: Hero, Features, Stats, Testimonials, CTA sections.
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  Sparkles,
  Zap,
  Palette,
  Layers,
  Code2,
  Download,
  Users,
  Star,
  ArrowRight,
  Play,
  Github,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Rocket,
  Globe,
  Shield,
  TrendingUp,
  Eye,
  MousePointerClick,
  Copy,
  RefreshCw,
  Heart,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

// ============ ANIMATED COUNTER COMPONENT ============
function AnimatedCounter({
  value,
  suffix = '',
  duration = 2000,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ============ HERO SECTION ============
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/25 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-pink-500/20 rounded-full blur-[120px] animate-pulse delay-500" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge 
            variant="outline" 
            className="mb-6 px-4 py-1.5 text-sm border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Introducing ROYCSS v2.0 — Now with 1800+ Effects
          </Badge>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Beautiful CSS Effects
            </span>
            <br />
            <span className="text-foreground">in Seconds</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The ultimate collection of production-ready CSS effects, components, and patterns. 
            Build stunning interfaces with copy-paste simplicity.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 group"
              asChild
            >
              <Link href="/roycss">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base border-border/50 hover:bg-muted/50 group"
              asChild
            >
              <Link href="/roycss/docs">
                <BookOpen className="mr-2 w-5 h-5" />
                View Documentation
              </Link>
            </Button>
          </div>

          {/* Stats Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { label: 'CSS Effects', value: 1800, suffix: '+', icon: <Zap className="w-5 h-5" /> },
              { label: 'Components', value: 500, suffix: '+', icon: <Layers className="w-5 h-5" /> },
              { label: 'Active Users', value: 50, suffix: 'K+', icon: <Users className="w-5 h-5" /> },
              { label: 'Downloads', value: 1, suffix: 'M+', icon: <Download className="w-5 h-5" /> },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden lg:block absolute left-10 top-1/3 animate-float">
          <Card className="shadow-xl border-border/50 p-3">
            <CardContent className="p-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium">Effect Applied</p>
                <p className="text-[10px] text-muted-foreground">Glow Button</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block absolute right-10 top-1/2 animate-float delay-1000">
          <Card className="shadow-xl border-border/50 p-3">
            <CardContent className="p-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium">Copy & Paste</p>
                <p className="text-[10px] text-muted-foreground">Zero dependencies</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50 animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// ============ FEATURES SECTION ============
const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: '1800+ CSS Effects',
    description: 'From subtle hover effects to complex animations. Every effect is hand-crafted and production-ready.',
    color: 'from-yellow-400 to-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: '500+ Components',
    description: 'Pre-built UI components that work out of the box. Buttons, cards, forms, modals, and more.',
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: 'Design Tokens',
    description: 'Complete design system with colors, spacing, typography, and shadows. Consistent by default.',
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: 'Copy & Paste',
    description: 'No build tools required. Just copy the code and paste it into your project. It just works.',
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Cross-Browser',
    description: 'Tested across all modern browsers. Graceful fallbacks for older browsers included.',
    color: 'from-cyan-400 to-teal-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Accessible',
    description: 'WCAG 2.1 AA compliant by default. Keyboard navigation, screen reader support, reduced motion.',
    color: 'from-violet-400 to-purple-500',
    bgColor: 'bg-violet-500/10',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything You Need to{' '}
            <span className="text-primary">Build Beautiful UIs</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete toolkit for modern web development. No more searching through dozens of resources.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Hover Glow Effect */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                "bg-gradient-to-br",
                feature.color,
                "blur-xl -z-10"
              )} style={{ opacity: 0.1 }} />
              
              <CardContent className="p-6">
                <div className={cn(
                  "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4",
                  feature.bgColor
                )}>
                  <div className={cn("text-foreground bg-gradient-to-r bg-clip-text text-transparent", feature.color)}>
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ LIVE PREVIEW CAROUSEL SECTION ============
const previewEffects = [
  { name: 'Glow Button', category: 'Buttons' },
  { name: 'Glassmorphism Card', category: 'Cards' },
  { name: 'Gradient Border', category: 'Borders' },
  { name: 'Text Shimmer', category: 'Typography' },
  { name: 'Morphing Shape', category: 'Shapes' },
  { name: 'Neon Input', category: 'Forms' },
];

function LivePreviewSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % previewEffects.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <Badge variant="secondary" className="mb-4">
              Live Preview
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              See Effects in{' '}
              <span className="text-primary">Action</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Explore our curated collection of effects. Each one is interactive and ready to use in your projects.
            </p>

            {/* Effect List */}
            <div className="space-y-2">
              {previewEffects.map((effect, index) => (
                <button
                  key={effect.name}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200",
                    activeIndex === index
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted text-muted-foreground border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4" />
                    <span className="font-medium">{effect.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {effect.category}
                  </Badge>
                </button>
              ))}
            </div>

            <Button className="mt-6 w-full sm:w-auto" asChild>
              <Link href="/roycss/effects">
                View All Effects
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* Right Preview Area */}
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl">
              {/* Preview Content based on active effect */}
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className={cn(
                    "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent animate-gradient-shift",
                    "from-blue-400 via-purple-400 to-pink-400"
                  )}>
                    {previewEffects[activeIndex].name}
                  </div>
                  
                  {/* Demo Element */}
                  <div className="space-y-4">
                    {activeIndex === 0 && (
                      <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300">
                        Glow Button
                      </button>
                    )}
                    {activeIndex === 1 && (
                      <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
                        <p className="text-white/80">Glassmorphism Card</p>
                      </div>
                    )}
                    {activeIndex <= 5 && activeIndex > 1 && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20">
                        <p className="text-white/80">{previewEffects[activeIndex].name} Preview</p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-white/40">
                    Click effects on the left →
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-2xl opacity-30" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full blur-2xl opacity-30" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ STATS SECTION ============
function StatsSection() {
  const stats = [
    { value: 1800, suffix: '+', label: 'CSS Effects', description: 'Hand-crafted animations' },
    { value: 500, suffix: '+', label: 'Components', description: 'Ready to use' },
    { value: 99.9, suffix: '%', label: 'Uptime', description: 'Reliable CDN' },
    { value: 50, suffix: 'K+', label: 'Developers', description: 'Trust ROYCSS' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="font-semibold text-foreground">{stat.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ TESTIMONIALS SECTION ============
const testimonials = [
  {
    content: "ROYCSS has completely transformed how I approach frontend development. The effects are stunning and the copy-paste workflow saves hours.",
    author: 'Sarah Chen',
    role: 'Senior Frontend Engineer',
    company: 'TechCorp',
    avatar: 'SC',
  },
  {
    content: "Finally, a CSS library that doesn't require a build step. I can use these effects anywhere - WordPress, React, even plain HTML.",
    author: 'Marcus Johnson',
    role: 'Freelance Developer',
    company: '@marcusdev',
    avatar: 'MJ',
  },
  {
    content: "The accessibility features are top-notch. My team uses ROYCSS for all our client projects now. The design tokens are incredibly well thought out.",
    author: 'Emily Rodriguez',
    role: 'Design Lead',
    company: 'Studio Design Co.',
    avatar: 'ER',
  },
  {
    content: "I was skeptical at first, but after trying it for one project, I'm converted. The quality is exceptional and the documentation is fantastic.",
    author: 'David Kim',
    role: 'Full Stack Developer',
    company: 'StartupXYZ',
    avatar: 'DK',
  },
];

function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by{' '}
            <span className="text-primary">Developers</span> Worldwide
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of developers who use ROYCSS to build beautiful interfaces faster.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.author}
              className="border-border/50 hover:border-primary/20 transition-all duration-300"
            >
              <CardContent className="p-6">
                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-foreground/90 leading-relaxed mb-6">
                  &ldquo;{testimonial.content}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ CTA SECTION ============
function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 md:p-20 text-center">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}
            />
          </div>

          {/* Glow Effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <Rocket className="w-12 h-12 mx-auto mb-6 text-white/80" />
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Build Something{' '}
              <span className="text-white/80">Beautiful?</span>
            </h2>
            
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
              Join over 50,000 developers who are already using ROYCSS to create stunning web experiences. 
              Start for free today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-6 text-base bg-white text-gray-900 hover:bg-gray-100 shadow-xl group"
                asChild
              >
                <Link href="/roycss">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 text-base border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <a href="https://github.com/Roy-Wanyoike/digital-lending-os" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 w-5 h-5" />
                  Star on GitHub
                </a>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Free forever for personal use
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                MIT License
              </span>
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Active community
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ MAIN HOMEPAGE COMPONENT ============
export default function Homepage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <LivePreviewSection />
        <StatsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
