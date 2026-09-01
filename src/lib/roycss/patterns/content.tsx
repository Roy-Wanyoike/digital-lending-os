/**
 * ROYCSS Pattern Library - Content Patterns
 * @module roycss/patterns/content
 * @description Reusable patterns for content display (blog, docs, pricing, etc.)
 */

'use client';

import React from 'react';
import { cn } from '@/components/roycss/shared/utils';

// ============================================================================
// Blog/Article Layout Pattern
// ============================================================================

export interface ArticleLayoutProps {
  /** Article title */
  title: string;
  /** Author info */
  author: {
    name: string;
    avatar?: string;
    bio?: string;
  };
  /** Publication date */
  date: string | Date;
  /** Reading time estimate */
  readTime?: string;
  /** Featured image URL */
  featuredImage?: string;
  /** Content sections */
  content: {
    id: string;
    type: 'heading' | 'paragraph' | 'image' | 'quote' | 'code' | 'list' | 'divider';
    content: string;
    level?: number;
    items?: string[];
    language?: string;
    caption?: string;
  }[];
  /** Tags */
  tags?: string[];
  /** Table of contents items */
  tocItems?: { id: string; label: string; level: number }[];
  /** Sidebar content */
  sidebar?: React.ReactNode;
  /** Actions (share, bookmark, etc.) */
  actions?: React.ReactNode;
  /** Class names */
  className?: string;
}

/**
 * Blog/Article Layout
 * Full-featured article layout with TOC, metadata, and rich content support.
 */
export function ArticleLayout({
  title,
  author,
  date,
  readTime,
  featuredImage,
  content,
  tags,
  tocItems,
  sidebar,
  actions,
  className,
}: ArticleLayoutProps) {
  const formatDate = (d: string | Date): string => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderContentBlock = (block: typeof content[0], index: number) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag key={index} id={block.id} className="font-bold text-foreground mt-8 mb-4 scroll-mt-20">
            {block.content}
          </HeadingTag>
        );
      
      case 'paragraph':
        return (
          <p key={index} className="text-muted-foreground leading-relaxed mb-4">
            {block.content}
          </p>
        );
      
      case 'image':
        return (
          <figure key={index} className="my-6">
            <img src={block.content} alt={block.caption || ''} className="rounded-lg w-full" />
            {block.caption && (
              <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );
      
      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-primary pl-4 my-6 italic text-lg">
            {block.content}
          </blockquote>
        );
      
      case 'code':
        return (
          <pre key={index} className="bg-muted rounded-lg p-4 overflow-x-auto my-4">
            <code className={`text-sm ${block.language ? `language-${block.language}` : ''}`}>
              {block.content}
            </code>
          </pre>
        );
      
      case 'list':
        return (
          <ul key={index} className="list-disc list-inside space-y-1 my-4 text-muted-foreground">
            {block.items?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      
      case 'divider':
        return <hr key={index} className="my-8 border-border" />;
      
      default:
        return null;
    }
  };

  return (
    <article className={cn('max-w-4xl mx-auto', className)}>
      {/* Header */}
      <header className="mb-10">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
          {title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {/* Author */}
          <div className="flex items-center gap-2">
            {author.avatar && (
              <img
                src={author.avatar}
                alt={author.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="font-medium text-foreground">{author.name}</span>
          </div>

          <span>•</span>
          <time dateTime={new Date(date).toISOString()}>{formatDate(date)}</time>

          {readTime && (
            <>
              <span>•</span>
              <span>{readTime} min read</span>
            </>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {featuredImage && (
        <figure className="mb-10">
          <img
            src={featuredImage}
            alt=""
            className="w-full rounded-xl"
          />
        </figure>
      )}

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 prose-custom">
          {content.map(renderContentBlock)}
        </div>

        {/* Sidebar - TOC & Extra */}
        {(tocItems || sidebar) && (
          <aside className="hidden lg:block w-56 flex-shrink-0">
            {tocItems && (
              <nav className="sticky top-24" aria-label="Table of contents">
                <h4 className="font-semibold text-sm text-foreground mb-3">Contents</h4>
                <ul className="space-y-2 text-sm">
                  {tocItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={cn(
                          'block text-muted-foreground hover:text-foreground transition-colors',
                          item.level === 3 && 'pl-3'
                        )}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {sidebar && <div className="mt-8">{sidebar}</div>}
          </aside>
        )}
      </div>

      {/* Footer Actions */}
      {actions && (
        <footer className="mt-12 pt-6 border-t flex justify-between items-center">
          {actions}
        </footer>
      )}
    </article>
  );
}

// ============================================================================
// Documentation Layout Pattern
// ============================================================================

export interface DocumentationLayoutProps {
  /** Page title */
  title: string;
  /** Description */
  description?: string;
  /** Navigation tree */
  navigation: {
    title: string;
    items: {
      id: string;
      label: string;
      href?: string;
      children?: { id: string; label: string; href?: string }[];
    }[];
  }[];
  /** Active page ID */
  activeId?: string;
  /** Main content */
  children: React.ReactNode;
  /** Right sidebar for on-this-page nav */
  headings?: { id: string; label: string; level: number }[];
  /** Edit link */
  editLink?: string;
  /** Last updated */
  lastUpdated?: string;
  /** Class names */
  className?: string;
}

/**
 * Documentation Layout
 * Standard documentation page with sidebar navigation and content area.
 */
export function DocumentationLayout({
  title,
  description,
  navigation,
  activeId,
  children,
  headings,
  editLink,
  lastUpdated,
  className,
}: DocumentationLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className="max-w-7xl mx-auto flex">
        {/* Left Sidebar - Navigation */}
        <aside className="w-64 hidden xl:block border-r fixed left-0 top-16 bottom-0 overflow-y-auto pt-6 px-4">
          <nav aria-label="Documentation navigation">
            {navigation.map((section) => (
              <div key={section.title} className="mb-6">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {section.title}
                </h5>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href ?? `#${item.id}`}
                        className={cn(
                          'block py-1.5 px-2 rounded-md text-sm transition-colors',
                          activeId === item.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                      >
                        {item.label}
                      </a>
                      
                      {/* Nested items */}
                      {item.children?.map((child) => (
                        <a
                          key={child.id}
                          href={child.href ?? `#${child.id}`}
                          className={cn(
                            'block py-1 pl-6 pr-2 rounded-md text-sm transition-colors',
                            activeId === child.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          {child.label}
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 xl:ml-64 xl:mr-64">
          <article className="max-w-3xl mx-auto px-6 py-8">
            {/* Header */}
            <header className="mb-8 pb-6 border-b">
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              
              {description && (
                <p className="text-lg text-muted-foreground">{description}</p>
              )}

              {(editLink || lastUpdated) && (
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  {lastUpdated && <span>Last updated: {lastUpdated}</span>}
                  {editLink && (
                    <a href={editLink} className="hover:text-foreground">Edit this page →</a>
                  )}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose-custom">{children}</div>
          </article>
        </main>

        {/* Right Sidebar - On This Page */}
        {headings && headings.length > 0 && (
          <aside className="hidden xl:block w-56 fixed right-0 top-16 bottom-0 overflow-y-auto pt-6 px-4">
            <nav aria-label="On this page">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                On this page
              </h5>
              <ul className="space-y-2 text-sm">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className={cn(
                        'block py-0.5 transition-colors',
                        heading.level === 3 && 'pl-3',
                        'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {heading.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pricing Table Pattern
// ============================================================================

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  period?: string;
  features: { text: string; included: boolean }[];
  ctaText: string;
  ctaHref?: string;
  highlighted?: boolean;
  badge?: string;
  disabled?: boolean;
}

export interface PricingTableProps {
  /** Plans to display */
  plans: PricingPlan[];
  /** Toggle for annual/monthly billing */
  showBillingToggle?: boolean;
  /** Annual discount text */
  annualDiscount?: string;
  /** On plan select callback */
  onSelectPlan?: (planId: string) => void;
  /** Class names */
  className?: string;
}

/**
 * Pricing Table
 * Feature comparison and pricing display with toggle.
 */
export function PricingTable({
  plans,
  showBillingToggle = true,
  annualDiscount = 'Save 20%',
  onSelectPlan,
  className,
}: PricingTableProps) {
  const [isAnnual, setIsAnnual] = React.useState(true);

  return (
    <div className={cn('max-w-6xl mx-auto', className)}>
      {/* Billing Toggle */}
      {showBillingToggle && (
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-3 p-1 bg-muted rounded-full">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full transition-colors',
                !isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              Monthly
            </button>
            
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full transition-colors',
                isAnnual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              Annual
              <span className="ml-2 text-xs text-success">{annualDiscount}</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative rounded-xl border p-6 flex flex-col',
              plan.highlighted
                ? 'border-primary ring-2 ring-primary/20 scale-105 z-10'
                : plan.disabled
                  ? 'opacity-60'
                  : 'border-border hover:border-primary/50'
            )}
          >
            {/* Badge */}
            {plan.badge && (
              <span className="absolute -top-3 left-6 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {plan.badge}
              </span>
            )}

            {/* Plan Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              )}
              
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">/{plan.period}</span>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {feature.included ? (
                    <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => !plan.disabled && onSelectPlan?.(plan.id)}
              disabled={plan.disabled}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-medium transition-colors',
                plan.highlighted
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input hover:bg-accent',
                plan.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {plan.ctaText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Testimonial Carousel Pattern
// ============================================================================

export interface Testimonial {
  id: string;
  quote: string;
  author: {
    name: string;
    role?: string;
    company?: string;
    avatar?: string;
  };
  rating?: number;
}

export interface TestimonialCarouselProps {
  /** Testimonials to display */
  testimonials: Testimonial[];
  /** Auto-play interval in ms (0 to disable) */
  autoPlayInterval?: number;
  /** Show dots indicator */
  showDots?: boolean;
  /** Show arrows */
  showArrows?: boolean;
  /** Cards per view */
  cardsPerView?: number;
  /** Class names */
  className?: string;
}

/**
 * Testimonial Carousel
 * Rotating testimonial cards with navigation.
 */
export function TestimonialCarousel({
  testimonials,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
  cardsPerView = 1,
  className,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Auto-advance
  React.useEffect(() => {
    if (autoPlayInterval <= 0) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(timerRef.current);
  }, [autoPlayInterval, testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const prevSlide = () => goToSlide((currentIndex - 1 + testimonials.length) % testimonials.length);
  const nextSlide = () => goToSlide((currentIndex + 1) % testimonials.length);

  // Get visible testimonials
  const getVisibleTestimonials = (): Testimonial[] => {
    const result: Testimonial[] = [];
    for (let i = 0; i < cardsPerView; i++) {
      result.push(testimonials[(currentIndex + i) % testimonials.length]);
    }
    return result;
  };

  return (
    <div className={cn('relative max-w-4xl mx-auto', className)}>
      {/* Arrows */}
      {showArrows && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 rounded-full bg-background border shadow-sm hover:bg-accent"
            aria-label="Previous testimonial"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 rounded-full bg-background border shadow-sm hover:bg-accent"
            aria-label="Next testimonial"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Testimonials Grid */}
      <div className={`grid ${cardsPerView === 1 ? 'grid-cols-1' : cardsPerView === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
        {getVisibleTestimonials().map((testimonial) => (
          <div
            key={`${testimonial.id}-${currentIndex}`}
            className="bg-background rounded-xl border p-6 animate-in fade-in-0 duration-300"
          >
            {/* Quote */}
            <blockquote className="text-foreground mb-6">
              <svg className="w-8 h-8 text-primary/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-base leading-relaxed">{testimonial.quote}</p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-3">
              {testimonial.author.avatar ? (
                <img
                  src={testimonial.author.avatar}
                  alt={testimonial.author.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {testimonial.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              )}
              
              <div>
                <p className="font-medium text-foreground text-sm">{testimonial.author.name}</p>
                {(testimonial.author.role || testimonial.author.company) && (
                  <p className="text-xs text-muted-foreground">
                    {[testimonial.author.role, testimonial.author.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
            </div>

            {/* Rating */}
            {testimonial.rating && (
              <div className="flex gap-0.5 mt-3">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < testimonial.rating ? 'text-yellow-500' : 'text-gray-300'
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      {showDots && testimonials.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Feature Comparison Table Pattern
// ============================================================================

export interface ComparisonFeature {
  name: string;
  description?: string;
  values: (string | boolean | React.ReactNode)[];
}

export interface FeatureComparisonProps {
  /** Column headers (products/plans) */
  headers: { name: string; highlighted?: boolean; badge?: string }[];
  /** Features to compare */
  features: ComparisonFeature[];
  /** Class names */
  className?: string;
}

/**
 * Feature Comparison Table
 * Side-by-side feature comparison across products or plans.
 */
export function FeatureComparison({ headers, features, className }: FeatureComparisonProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr>
            <th className="text-left p-4 font-semibold text-foreground w-[200px]">
              Features
            </th>
            {headers.map((header, index) => (
              <th
                key={index}
                className={cn(
                  'text-center p-4 font-semibold',
                  header.highlighted ? 'text-primary' : 'text-foreground'
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  {header.badge && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {header.badge}
                    </span>
                  )}
                  {header.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-muted/30')}
            >
              <td className="p-4">
                <div>
                  <p className="font-medium text-foreground text-sm">{feature.name}</p>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                  )}
                </div>
              </td>
              {feature.values.map((value, colIndex) => (
                <td key={colIndex} className="text-center p-4">
                  {typeof value === 'boolean' ? (
                    value ? (
                      <svg className="w-5 h-5 text-success mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-muted-foreground mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )
                  ) : (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ArticleLayout;
