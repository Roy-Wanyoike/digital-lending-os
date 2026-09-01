/**
 * ROYCSS Layout Effects Catalog
 * 
 * Comprehensive collection of 60+ CSS layout effects
 * including grid patterns, flexbox layouts, masonry arrangements,
 * and card designs.
 * 
 * @module roycss/effects/catalog/layout
 * @version 1.0.0
 */

import { RoyCSSEffect } from '../types';

// ============================================================================
// Base Browser Support for Layout Effects
// ============================================================================

const LAYOUT_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  unsupported: ['ie'],
  notes: 'Modern CSS layout features (Grid, Flexbox) well-supported',
};

const GRID_BROWSER_SUPPORT = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  partialSupport: ['safari'], // Some newer features may need prefixes
  unsupported: ['ie'],
  notes: 'CSS Grid fully supported in modern browsers',
};

// ============================================================================
// GRID LAYOUTS
// ============================================================================

/**
 * Basic Grid - Simple responsive grid
 */
export const basicGrid: RoyCSSEffect = {
  id: 'basic-grid',
  name: 'Basic Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Simple responsive CSS Grid layout',
  css: `.basic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}`,
  tags: ['grid', 'responsive', 'auto-fit', 'basic', 'columns'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'minWidth', label: 'Min Column Width', description: 'Minimum column size', type: 'length', defaultValue: 250, unit: 'px' },
    { name: 'gap', label: 'Gap', description: 'Space between items', type: 'length', defaultValue: 24, unit: 'px' },
  ],
};

/**
 * Masonry Grid - Pinterest-style layout
 */
export const masonryGrid: RoyCSSEffect = {
  id: 'masonry-grid',
  name: 'Masonry Grid',
  category: 'layout',
  subCategory: 'masonry',
  description: 'Pinterest-like masonry layout using columns',
  css: `.masonry-grid {
  column-count: 3;
  column-gap: 16px;
}

.masonry-grid > * {
  break-inside: avoid;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .masonry-grid { column-count: 2; }
}
@media (max-width: 480px) {
  .masonry-grid { column-count: 1; }
}`,
  tags: ['masonry', 'pinterest', 'columns', 'waterfall', 'cards'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'columns', label: 'Columns', description: 'Number of columns', type: 'number', defaultValue: 3, min: 1, max: 6 },
  ],
};

/**
 * Bento Grid - Apple-style bento layout
 */
export const bentoGrid: RoyCSSEffect = {
  id: 'bento-grid',
  name: 'Bento Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Apple-inspired bento box grid layout',
  css: `.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, auto);
  gap: 16px;
}

.bento-item-1 { grid-column: span 2; grid-row: span 2; }
.bento-item-2 { grid-column: span 1; }
.bento-item-3 { grid-column: span 1; }
.bento-item-4 { grid-column: span 2; }

@media (max-width: 768px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
}`,
  tags: ['bento', 'apple', 'dashboard', 'widget', 'spanning'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Dashboard Grid - Analytics dashboard layout
 */
export const dashboardGrid: RoyCSSEffect = {
  id: 'dashboard-grid',
  name: 'Dashboard Grid',
  category: 'layout',
  subCategory: 'grid',
  description: '12-column dashboard grid system',
  css: `.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}

.dashboard-sidebar { grid-column: span 3; }
.dashboard-main { grid-column: span 9; }
.dashboard-full { grid-column: span 12; }
.dashboard-half { grid-column: span 6; }
.dashboard-quarter { grid-column: span 3; }

@media (max-width: 1024px) {
  .dashboard-sidebar { grid-column: span 12; }
  .dashboard-main { grid-column: span 12; }
}`,
  tags: ['dashboard', 'sidebar', 'main', '12-column', 'analytics'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Auto Fill Grid - Responsive auto-fill
 */
export const autoFillGrid: RoyCSSEffect = {
  id: 'auto-fill-grid',
  name: 'Auto Fill Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Grid that automatically fills available space',
  css: `.auto-fill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}`,
  tailwind: 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5',
  tags: ['grid', 'auto-fill', 'responsive', 'fluid', 'adaptive'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Nested Grid - Complex nested structure
 */
export const nestedGrid: RoyCSSEffect = {
  id: 'nested-grid',
  name: 'Nested Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Complex nested grid layout structure',
  css: `.nested-grid {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: 1px;
  background: #e5e7eb;
}

.nested-header { grid-column: 1 / -1; background: white; }
.nested-sidebar { grid-row: 2 / 4; background: white; }
.nested-content { background: white; }
.nested-footer { grid-column: 1 / -1; background: white; }`,
  tags: ['nested', 'complex', 'holy-grail', 'structure', 'app-layout'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Aspect Ratio Grid - Fixed aspect ratio cells
 */
export const aspectRatioGrid: RoyCSSEffect = {
  id: 'aspect-ratio-grid',
  name: 'Aspect Ratio Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Grid with fixed aspect ratio cells',
  css: `.aspect-ratio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.aspect-ratio-grid > * {
  aspect-ratio: 16 / 9;
  object-fit: cover;
}`,
  tags: ['aspect-ratio', 'fixed', 'images', 'gallery', 'video'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'ratio', label: 'Aspect Ratio', description: 'Width:Height ratio', type: 'string', defaultValue: '16/9' },
  ],
};

/**
 * Subgrid - Child inherits parent tracks
 */
export const subgridLayout: RoyCSSEffect = {
  id: 'subgrid-layout',
  name: 'Subgrid Layout',
  category: 'layout',
  subCategory: 'grid',
  description: 'Subgrid that aligns with parent grid tracks',
  css: `.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.subgrid-container {
  grid-column: span 3;
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
  gap: inherit;
}`,
  tags: ['subgrid', 'inherit', 'alignment', 'nested', 'advanced'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

// ============================================================================
// FLEXBOX LAYOUTS
// ============================================================================

/**
 * Center Everything - Perfect centering
 */
export const centerEverything: RoyCSSEffect = {
  id: 'center-everything',
  name: 'Center Everything',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Perfect centering using flexbox',
  css: `.center-everything {
  display: flex;
  justify-content: center;
  align-items: center;
}`,
  tailwind: 'flex justify-center items-center',
  tags: ['center', 'flexbox', 'alignment', 'basic', 'common'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Space Between - Evenly distributed
 */
export const spaceBetween: RoyCSSEffect = {
  id: 'space-between',
  name: 'Space Between',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Items distributed with space between them',
  css: `.space-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}`,
  tailwind: 'flex justify-between items-center',
  tags: ['space-between', 'justify', 'distribute', 'navbar', 'header'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Space Evenly - Equal spacing all around
 */
export const spaceEvenly: RoyCSSEffect = {
  id: 'space-evenly',
  name: 'Space Evenly',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Equal spacing around all items',
  css: `.space-evenly {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
}`,
  tailwind: 'flex justify-evenly items-center',
  tags: ['space-evenly', 'equal', 'distribution', 'menu'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Flex Wrap - Wrapping flex container
 */
export const flexWrapLayout: RoyCSSEffect = {
  id: 'flex-wrap-layout',
  name: 'Flex Wrap Layout',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Flex container that wraps to next line',
  css: `.flex-wrap-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}`,
  tailwind: 'flex flex-wrap gap-3',
  tags: ['wrap', 'flexbox', 'responsive', 'tags', 'chips'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'gap', label: 'Gap', description: 'Space between wrapped items', type: 'length', defaultValue: 12, unit: 'px' },
  ],
};

/**
 * Sticky Footer - Footer sticks to bottom
 */
export const stickyFooter: RoyCSSEffect = {
  id: 'sticky-footer',
  name: 'Sticky Footer',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Footer that stays at bottom even with little content',
  css: `.sticky-footer-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sticky-footer-wrapper main {
  flex: 1;
}

.sticky-footer-wrapper footer {
  margin-top: auto;
}`,
  tags: ['footer', 'sticky', 'bottom', 'page-layout', 'min-height'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: false,
  properties: [],
};

/**
 * Holy Grail Layout - Classic web layout
 */
export const holyGrailLayout: RoyCSSEffect = {
  id: 'holy-grail-layout',
  name: 'Holy Grail Layout',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Classic header + sidebar + content + footer layout',
  css: `.holy-grail {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.holy-grail-header,
.holy-grail-footer {
  flex-shrink: 0;
}

.holy-grail-body {
  display: flex;
  flex: 1;
}

.holy-grail-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.holy-grail-content {
  flex: 1;
  padding: 20px;
}

@media (max-width: 768px) {
  .holy-grail-body { flex-direction: column; }
  .holy-grail-sidebar { width: 100%; order: 2; }
  .holy-grail-content { order: 1; }
}`,
  tags: ['holy-grail', 'classic', 'sidebar', 'header', 'footer', 'app'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Navbar Layout - Horizontal navigation bar
 */
export const navbarLayout: RoyCSSEffect = {
  id: 'navbar-layout',
  name: 'Navbar Layout',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Flexible horizontal navigation bar layout',
  css: `.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 24px;
}`,
  tags: ['navbar', 'navigation', 'header', 'horizontal', 'menu'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Card Row - Horizontal card row
 */
export const cardRow: RoyCSSEffect = {
  id: 'card-row',
  name: 'Card Row',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Horizontal scrolling/flexing card row',
  css: `.card-row {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 10px 0;
  scroll-snap-type: x mandatory;
}

.card-row > * {
  flex: 0 0 300px;
  scroll-snap-align: start;
}`,
  tags: ['card', 'row', 'horizontal', 'scroll', 'carousel'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [
    { name: 'cardWidth', label: 'Card Width', description: 'Fixed card width', type: 'length', defaultValue: 300, unit: 'px' },
  ],
};

/**
 * Vertical Stack - Stacked elements
 */
export const verticalStack: RoyCSSEffect = {
  id: 'vertical-stack',
  name: 'Vertical Stack',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Vertical stacking of elements with gaps',
  css: `.vertical-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}`,
  tailwind: 'flex flex-col gap-4',
  tags: ['stack', 'vertical', 'column', 'form', 'list'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'gap', label: 'Gap', description: 'Vertical spacing', type: 'length', defaultValue: 16, unit: 'px' },
  ],
};

/**
 * Equal Height Columns - Same height children
 */
export const equalHeightColumns: RoyCSSEffect = {
  id: 'equal-height-columns',
  name: 'Equal Height Columns',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'All child elements have equal height',
  css: `.equal-height-columns {
  display: flex;
  gap: 24px;
}

.equal-height-columns > * {
  flex: 1;
}`,
  tags: ['equal-height', 'columns', 'stretch', 'cards', 'uniform'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Media Object - Image + content pattern
 */
export const mediaObject: RoyCSSEffect = {
  id: 'media-object',
  name: 'Media Object',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Classic media object pattern (image + text)',
  css: `.media-object {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.media-object-image {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.media-object-body {
  flex: 1;
  min-width: 0;
}`,
  tags: ['media-object', 'image', 'text', 'comment', 'list-item'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

// ============================================================================
// CARD LAYOUTS
// ============================================================================

/**
 * Standard Card - Basic card component
 */
export const standardCard: RoyCSSEffect = {
  id: 'standard-card',
  name: 'Standard Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Standard card component with image, body, and footer',
  css: `.standard-card {
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transition: transform 0.2s, box-shadow 0.2s;
}

.standard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.standard-card-image {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.standard-card-body {
  padding: 20px;
}

.standard-card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.standard-card-text {
  color: #6b7280;
  line-height: 1.5;
}

.standard-card-footer {
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
}`,
  tags: ['card', 'component', 'hover', 'shadow', 'standard'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Profile Card - User profile card
 */
export const profileCard: RoyCSSEffect = {
  id: 'profile-card',
  name: 'Profile Card',
  category: 'layout',
  subCategory: 'card',
  description: 'User profile card with avatar and info',
  css: `.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  max-width: 320px;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-title {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 16px;
}

.profile-stats {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  width: 100%;
  justify-content: center;
}`,
  tags: ['profile', 'avatar', 'user', 'bio', 'social'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Pricing Card - Product pricing display
 */
export const pricingCard: RoyCSSEffect = {
  id: 'pricing-card',
  name: 'Pricing Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Product/service pricing tier card',
  css: `.pricing-card {
  background: white;
  border-radius: 20px;
  padding: 40px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  transition: transform 0.3s, border-color 0.3s;
}

.pricing-card.featured {
  border-color: #3b82f6;
}

.pricing-card:hover {
  transform: scale(1.02);
}

.pricing-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pricing-price {
  font-size: 48px;
  font-weight: 800;
  margin: 16px 0;
}

.pricing-period {
  color: #6b7280;
  font-size: 14px;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 24px 0;
  text-align: left;
}

.pricing-features li {
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}`,
  tags: ['pricing', 'tier', 'product', 'saas', 'subscription'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Testimonial Card - Customer review card
 */
export const testimonialCard: RoyCSSEffect = {
  id: 'testimonial-card',
  name: 'Testimonial Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Customer testimonial/review card',
  css: `.testimonial-card {
  background: white;
  border-radius: 16px;
  padding: 28px;
  position: relative;
}

.testimonial-quote {
  font-size: 48px;
  color: #e5e7eb;
  position: absolute;
  top: 16px;
  left: 20px;
  font-family: Georgia, serif;
}

.testimonial-text {
  font-size: 16px;
  line-height: 1.7;
  color: #374151;
  margin-bottom: 20px;
  padding-left: 30px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.testimonial-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonial-name {
  font-weight: 600;
  font-size: 14px;
}

.testimonial-role {
  color: #6b7280;
  font-size: 13px;
}`,
  tags: ['testimonial', 'review', 'quote', 'customer', 'feedback'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Stats Card - Metric/statistic display
 */
export const statsCard: RoyCSSEffect = {
  id: 'stats-card',
  name: 'Stats Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Key metric or statistic display card',
  css: `.stats-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.stats-info h3 {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.stats-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stats-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 20px;
}

.stats-change.positive {
  background: #dcfce7;
  color: #166534;
}

.stats-change.negative {
  background: #fee2e2;
  color: #991b1b;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  color: #3b82f6;
}`,
  tags: ['stats', 'metric', 'kpi', 'dashboard', 'number'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Feature Card - Feature highlight card
 */
export const featureCard: RoyCSSEffect = {
  id: 'feature-card',
  name: 'Feature Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Feature/benefit highlight card with icon',
  css: `.feature-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 28px;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.feature-description {
  color: #6b7280;
  line-height: 1.6;
}`,
  tags: ['feature', 'benefit', 'icon', 'highlight', 'service'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Blog Post Card - Article preview card
 */
export const blogPostCard: RoyCSSEffect = {
  id: 'blog-post-card',
  name: 'Blog Post Card',
  category: 'layout',
  subCategory: 'card',
  description: 'Blog post/article preview card',
  css: `.blog-post-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.blog-post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.blog-post-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.blog-post-content {
  padding: 24px;
}

.blog-post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.blog-post-category {
  background: #ede9fe;
  color: #7c3aed;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.blog-post-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.4;
}

.blog-post-excerpt {
  color: #6b7280;
  line-height: 1.6;
}`,
  tags: ['blog', 'article', 'post', 'preview', 'content'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// RESPONSIVE LAYOUTS
// ============================================================================

/**
 * Mobile First Container - Progressive enhancement
 */
export const mobileFirstContainer: RoyCSSEffect = {
  id: 'mobile-first-container',
  name: 'Mobile First Container',
  category: 'layout',
  subCategory: 'responsive',
  description: 'Container that adapts from mobile to desktop',
  css: `.mobile-first-container {
  width: 100%;
  padding: 0 16px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .mobile-first-container { max-width: 640px; padding: 0 24px; }
}
@media (min-width: 768px) {
  .mobile-first-container { max-width: 768px; }
}
@media (min-width: 1024px) {
  .mobile-first-container { max-width: 1024px; }
}
@media (min-width: 1280px) {
  .mobile-first-container { max-width: 1280px; }
}`,
  tags: ['container', 'responsive', 'mobile-first', 'fluid', 'breakpoints'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Sidebar Layout - Collapsible sidebar
 */
export const sidebarLayout: RoyCSSEffect = {
  id: 'sidebar-layout',
  name: 'Sidebar Layout',
  category: 'layout',
  subCategory: 'responsive',
  description: 'Responsive sidebar that collapses on mobile',
  css: `.sidebar-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.main-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 50;
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
}`,
  tags: ['sidebar', 'collapsible', 'drawer', 'off-canvas', 'responsive'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Two Column Layout - Content + aside
 */
export const twoColumnLayout: RoyCSSEffect = {
  id: 'two-column-layout',
  name: 'Two Column Layout',
  category: 'layout',
  subColumn: 'responsive',
  description: 'Main content with side panel layout',
  css: `.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}

@media (max-width: 900px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
  
  .two-column-aside {
    order: 2;
  }
}`,
  tags: ['two-column', 'aside', 'article', 'sidebar', 'responsive'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [
    { name: 'asideWidth', label: 'Aside Width', description: 'Side panel width', type: 'length', defaultValue: 300, unit: 'px' },
  ],
};

/**
 * Three Column Layout - Triple column design
 */
export const threeColumnLayout: RoyCSSEffect = {
  id: 'three-column-layout',
  name: 'Three Column Layout',
  category: 'layout',
  subCategory: 'responsive',
  description: 'Three equal or proportional columns',
  css: `.three-column-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .three-column-layout {
    grid-template-columns: 1fr;
  }
}`,
  tags: ['three-column', 'triple', 'equal', 'responsive'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Full Bleed Section - Edge-to-edge sections
 */
export const fullBleedSection: RoyCSSEffect = {
  id: 'full-bleed-section',
  name: 'Full Bleed Section',
  category: 'layout',
  subCategory: 'responsive',
  description: 'Section that breaks out of container bounds',
  css: `.full-bleed-section {
  width: calc(100vw - 100% + 100%);
  margin-left: calc(-50vw + 50%);
  padding: 80px calc((100vw - 1200px) / 2);
}

/* Alternative using negative margins on known container */
.full-bleed-alt {
  margin-left: -50vw;
  margin-right: -50vw;
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: calc(-50vw + 50%);
}`,
  tags: ['full-bleed', 'edge-to-edge', 'hero', 'banner', 'breakout'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'advanced',
  customizable: true,
  properties: [],
};

/**
 * Split Screen - Two pane hero section
 */
export const splitScreen: RoyCSSEffect = {
  id: 'split-screen',
  name: 'Split Screen',
  category: 'layout',
  subCategory: 'responsive',
  description: 'Two-pane split screen layout (50/50)',
  css: `.split-screen {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.split-screen-left,
.split-screen-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.split-screen-left {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.split-screen-right {
  background: #f9fafb;
}

@media (max-width: 768px) {
  .split-screen {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}`,
  tags: ['split-screen', 'hero', 'landing', 'two-pane', 'full-page'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// SPECIAL LAYOUT PATTERNS
// ============================================================================

/**
 * Timeline Layout - Vertical timeline
 */
export const timelineLayout: RoyCSSEffect = {
  id: 'timeline-layout',
  name: 'Timeline Layout',
  category: 'layout',
  subCategory: 'grid',
  description: 'Vertical timeline/event sequence layout',
  css: `.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.timeline-item {
  position: relative;
  padding-bottom: 32px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -26px;
  top: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 3px solid #3b82f6;
}

.timeline-item:last-child {
  padding-bottom: 0;
}`,
  tags: ['timeline', 'events', 'history', 'milestones', 'vertical'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Gallery Grid - Photo gallery layout
 */
export const galleryGrid: RoyCSSEffect = {
  id: 'gallery-grid',
  name: 'Gallery Grid',
  category: 'layout',
  subCategory: 'grid',
  description: 'Photo/image gallery with varied sizes',
  css: `.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 150px;
  gap: 8px;
}

.gallery-item:nth-child(1) {
  grid-column: span 2;
  grid-row: span 2;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}`,
  tags: ['gallery', 'photos', 'images', 'masonry', 'portfolio'],
  browserSupport: GRID_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

/**
 * Table Layout - Data table styling
 */
export const tableLayoutStyle: RoyCSSEffect = {
  id: 'table-layout-style',
  name: 'Table Layout Style',
  category: 'layout',
  subCategory: 'grid',
  description: 'Styled data table with modern aesthetics',
  css: `.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #4b5563;
}

.data-table tr:hover td {
  background: #f9fafb;
}

.data-table tr:last-child td {
  border-bottom: none;
}`,
  tags: ['table', 'data', 'rows', 'headers', 'striped'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Form Layout - Form field arrangement
 */
export const formLayout: RoyCSSEffect = {
  id: 'form-layout',
  name: 'Form Layout',
  category: 'layout',
  subCategory: 'flexbox',
  description: 'Organized form field layout with labels',
  css: `.form-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}`,
  tags: ['form', 'input', 'label', 'field', 'validation'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'beginner',
  customizable: true,
  properties: [],
};

/**
 * Overlay Layout - Positioned overlay content
 */
export const overlayLayout: RoyCSSEffect = {
  id: 'overlay-layout',
  name: 'Overlay Layout',
  category: 'layout',
  subCategory: 'grid',
  description: 'Content overlaid on top of another element',
  css: `.overlay-container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}

.overlay-base {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.overlay-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
}`,
  tags: ['overlay', 'positioned', 'absolute', 'caption', 'card'],
  browserSupport: LAYOUT_BROWSER_SUPPORT,
  difficulty: 'intermediate',
  customizable: true,
  properties: [],
};

// ============================================================================
// Export All Layout Effects
// ============================================================================

/**
 * Complete array of all layout effects
 */
export const layoutEffects: RoyCSSEffect[] = [
  // Grid Layouts
  basicGrid, masonryGrid, bentoGrid, dashboardGrid,
  autoFillGrid, nestedGrid, aspectRatioGrid, subgridLayout,

  // Flexbox Layouts
  centerEverything, spaceBetween, spaceEvenly,
  flexWrapLayout, stickyFooter, holyGrailLayout,
  navbarLayout, cardRow, verticalStack, equalHeightColumns,
  mediaObject,

  // Card Layouts
  standardCard, profileCard, pricingCard, testimonialCard,
  statsCard, featureCard, blogPostCard,

  // Responsive Layouts
  mobileFirstContainer, sidebarLayout, twoColumnLayout,
  threeColumnLayout, fullBleedSection, splitScreen,

  // Special Patterns
  timelineLayout, galleryGrid, tableLayoutStyle,
  formLayout, overlayLayout,
];

export default layoutEffects;
