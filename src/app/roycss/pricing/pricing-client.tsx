'use client';

/**
 * Pricing Page
 * 
 * Pricing plans for ROYCSS.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  ArrowRight,
  HelpCircle,
  Star
} from 'lucide-react';

// Plans data
const plans = [
  {
    name: 'Free',
    description: 'For personal projects and learning',
    price: '$0',
    period: '/month',
    icon: <Zap className="w-6 h-6" />,
    color: 'from-gray-500 to-gray-600',
    popular: false,
    features: [
      { text: '500+ effects', included: true },
      { text: '100+ components', included: true },
      { text: 'Community support', included: true },
      { text: 'MIT License', included: true },
      { text: 'Premium effects', included: false },
      { text: 'Priority support', included: false },
      { text: 'Commercial use', included: false },
      { text: 'Team collaboration', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/roycss/docs/getting-started',
  },
  {
    name: 'Pro',
    description: 'For professional developers and small teams',
    price: '$19',
    period: '/month',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'from-blue-500 to-purple-500',
    popular: true,
    features: [
      { text: '1800+ effects', included: true },
      { text: '500+ components', included: true },
      { text: 'Email support', included: true },
      { text: 'Commercial license', included: true },
      { text: 'Premium effects pack', included: true },
      { text: 'Priority support', included: true },
      { text: 'Figma design files', included: true },
      { text: '1 team member', included: true },
    ],
    cta: 'Start Pro Trial',
    ctaHref: '#',
  },
  {
    name: 'Team',
    description: 'For teams and organizations',
    price: '$49',
    period: '/month',
    icon: <Building2 className="w-6 h-6" />,
    color: 'from-purple-500 to-pink-500',
    popular: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Custom branding', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Analytics dashboard', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: '#contact',
  },
];

// FAQ data
const faqs = [
  {
    question: 'Can I use ROYCSS in commercial projects?',
    answer: 'Yes! The Pro and Team plans include a commercial license. The free plan is for personal/non-commercial use only.',
  },
  {
    question: 'What happens after my trial ends?',
    answer: 'You can continue with the free plan or upgrade to Pro. Your data and settings are preserved.',
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Absolutely! You can upgrade or downgrade at any time. Changes take effect at the next billing cycle.',
  },
  {
    question: 'Do you offer discounts for startups?',
    answer: 'Yes! We offer 50% off for eligible startups for the first year. Contact us for details.',
  },
];

export function PricingPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple, Transparent{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include core ROYCSS features.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm font-medium">Monthly</span>
            <Button variant="outline" size="icon" className="w-12 h-6 rounded-full relative">
              <span className="absolute left-1 w-4 h-4 rounded-full bg-primary" />
            </Button>
            <span className="text-sm text-muted-foreground">Annual (Save 20%)</span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "relative overflow-hidden flex flex-col",
                plan.popular && "border-primary shadow-xl shadow-primary/10 scale-105"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0">
                  <Badge className="rounded-none w-full justify-center py-1 bg-gradient-to-r from-blue-600 to-purple-600">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className={cn("pt-8", !plan.popular && "pt-6")}>
                <div className={cn(
                  "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br text-white",
                  plan.color
                )}>
                  {plan.icon}
                </div>
                
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={cn(!feature.included && "text-muted-foreground")}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className={cn(
                    "w-full",
                    plan.popular && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.ctaHref}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <section className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground text-sm pl-7">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default PricingPageClient;
