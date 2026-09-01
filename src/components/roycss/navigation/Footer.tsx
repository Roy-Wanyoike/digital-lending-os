/**
 * Footer Component
 * 
 * Site footer with links, social media, and legal information.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Heart,
  ArrowUpRight
} from 'lucide-react';

// Footer link groups
const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '/roycss#features' },
      { label: 'Effects', href: '/roycss/effects' },
      { label: 'Components', href: '/roycss/components' },
      { label: 'Patterns', href: '/roycss/patterns' },
      { label: 'Pricing', href: '/roycss/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/roycss/docs' },
      { label: 'API Reference', href: '/roycss/docs/api-reference' },
      { label: 'Examples', href: '/roycss/examples' },
      { label: 'Blog', href: '/blog' },
      { label: 'Community', href: '/community' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Status', href: '/status' },
      { label: 'Contact', href: '#contact' },
      { label: 'Careers', href: '#' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
};

const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/Roy-Wanyoike/digital-lending-os',
    icon: <Github className="w-5 h-5" />,
  },
  {
    label: 'Twitter',
    href: 'https://twitter.com/roycss',
    icon: <Twitter className="w-5 h-5" />,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/roycss',
    icon: <Linkedin className="w-5 h-5" />,
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@roycss',
    icon: <Youtube className="w-5 h-5" />,
  },
];

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn('border-t bg-background', className)}>
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Section - Links Grid */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-primary/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                ROY<span className="text-primary">CSS</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              The ultimate CSS effects and components library for modern web development. 
              Build beautiful interfaces faster.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        {/* Bottom Section */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            © {currentYear} ROYCSS. Built with{' '}
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-0.5" />{' '}
            for developers.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Minimal footer variant for landing pages
export function MinimalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t bg-background', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">ROYCSS</span>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ROYCSS. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.slice(0, 2).map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
