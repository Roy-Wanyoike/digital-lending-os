/**
 * Search Command
 * @module roycss-cli/commands/search
 * @description Search for effects and components
 */

import { Command } from 'commander';
import { logger } from '../utils/logger';

/** Searchable item interface */
interface SearchableItem {
  name: string;
  category: string;
  tags: string[];
  description: string;
}

/** Effects database */
const EFFECTS_DB: SearchableItem[] = [
  { name: 'bounce', category: 'animation', tags: ['animation', 'attention', 'playful'], description: 'Creates a bouncing animation effect' },
  { name: 'fade-in', category: 'transition', tags: ['transition', 'entrance', 'subtle'], description: 'Smooth fade-in effect for elements appearing' },
  { name: 'fade-out', category: 'transition', tags: ['transition', 'exit', 'subtle'], description: 'Smooth fade-out effect for elements leaving' },
  { name: 'slide-up', category: 'transition', tags: ['transition', 'entrance', 'vertical'], description: 'Slides element in from below' },
  { name: 'slide-down', category: 'transition', tags: ['transition', 'entrance', 'vertical'], description: 'Slides element in from above' },
  { name: 'slide-left', category: 'transition', tags: ['transition', 'entrance', 'horizontal'], description: 'Slides element in from right' },
  { name: 'slide-right', category: 'transition', tags: ['transition', 'entrance', 'horizontal'], description: 'Slides element in from left' },
  { name: 'zoom-in', category: 'transition', tags: ['transition', 'entrance', 'scale'], description: 'Scales element up while fading in' },
  { name: 'zoom-out', category: 'transition', tags: ['transition', 'exit', 'scale'], description: 'Scales element down while fading out' },
  { name: 'rotate-in', category: 'transition', tags: ['transition', 'entrance', 'dramatic'], description: 'Rotates element into view' },
  { name: 'pulse', category: 'animation', tags: ['animation', 'attention', 'loading'], description: 'Pulsing/glowing attention effect' },
  { name: 'shake', category: 'animation', tags: ['animation', 'error', 'alert'], description: 'Shaking effect for errors or alerts' },
  { name: 'spin', category: 'animation', tags: ['animation', 'loading', 'continuous'], description: 'Continuous rotation effect' },
  { name: 'ping', category: 'animation', tags: ['animation', 'notification', 'radar'], description: 'Ping/radar notification effect' },
  { name: 'float', category: 'animation', tags: ['animation', 'ambient', 'gentle'], description: 'Floating/bobbing ambient motion' },
  { name: 'glow', category: 'effect', tags: ['effect', 'neon', 'accent'], description: 'Glowing box-shadow effect' },
  { name: 'hover-lift', category: 'interaction', tags: ['hover', 'card', 'elevation'], description: 'Lift up on hover with shadow' },
  { name: 'gradient-text', category: 'effect', tags: ['text', 'gradient', 'colorful'], description: 'Gradient colored text effect' },
  { name: 'underline-gradient', category: 'interaction', tags: ['link', 'underline', 'animated'], description: 'Animated gradient underline' }
];

/** Components database */
const COMPONENTS_DB: SearchableItem[] = [
  { name: 'button', category: 'interactive', tags: ['button', 'click', 'cta'], description: 'Versatile button with variants' },
  { name: 'card', category: 'layout', tags: ['card', 'container', 'content'], description: 'Container for grouped content' },
  { name: 'input', category: 'form', tags: ['input', 'form', 'field'], description: 'Text input with validation states' },
  { name: 'modal', category: 'overlay', tags: ['modal', 'dialog', 'popup'], description: 'Overlay dialog component' },
  { name: 'avatar', category: 'display', tags: ['avatar', 'user', 'image'], description: 'User avatar/image display' },
  { name: 'badge', category: 'display', tags: ['badge', 'label', 'tag'], description: 'Small status indicator' },
  { name: 'dropdown', category: 'navigation', tags: ['dropdown', 'menu', 'select'], description: 'Dropdown menu component' },
  { name: 'tooltip', category: 'feedback', tags: ['tooltip', 'hint', 'help'], description: 'Hover information popup' }
];

/** Search options */
interface SearchOptions {
  category?: string;
  tag?: string;
  type?: 'effect' | 'component' | 'all';
  limit?: number;
  json?: boolean;
}

/**
 * Perform search across database
 */
function performSearch(query: string, options: SearchOptions): SearchableItem[] {
  let db = [...EFFECTS_DB];
  
  if (options.type !== 'effect') {
    db = [...db, ...COMPONENTS_DB];
  } else if (options.type === 'component') {
    db = [...COMPONENTS_DB];
  }

  // Filter by query
  const lowerQuery = query.toLowerCase();
  let results = db.filter(item =>
    item.name.includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery) ||
    item.tags.some(tag => tag.includes(lowerQuery)) ||
    item.category.includes(lowerQuery)
  );

  // Filter by category
  if (options.category) {
    results = results.filter(item => item.category === options.category);
  }

  // Filter by tag
  if (options.tag) {
    results = results.filter(item => 
      item.tags.some(tag => tag.includes(options.tag!))
    );
  }

  // Sort by relevance (exact name match first)
  results.sort((a, b) => {
    const aExact = a.name === lowerQuery ? 0 : 1;
    const bExact = b.name === lowerQuery ? 0 : 1;
    return aExact - bExact;
  });

  // Apply limit
  if (options.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Execute search command
 */
export async function executeSearch(query: string, options: SearchOptions): Promise<void> {
  if (!query) {
    logger.error('Please provide a search query.');
    logger.info('Example: roycss search "button hover"');
    return;
  }

  const results = performSearch(query, options);

  if (results.length === 0) {
    logger.warning(`No results found for "${query}".`);
    logger.info('Try different keywords or browse all effects with: roycss add --list');
    return;
  }

  // Output format
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Pretty table output
  logger.header(`Search Results: "${query}" (${results.length} found)`);

  const headers = ['Name', 'Category', 'Tags', 'Description'];
  const rows = results.map(item => [
    item.name,
    item.category,
    item.tags.slice(0, 3).join(', '),
    item.description.length > 50 ? item.description.slice(0, 47) + '...' : item.description
  ]);

  logger.table(headers, rows);

  // Show usage hint
  logger.blank();
  logger.info('To add an effect, run:');
  logger.info('  roycss add <name>');
}

/** Export command for Commander */
export const searchCommand = new Command('search')
  .description('Search for effects and components')
  .argument('<query>', 'Search query')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--type <type>', 'Search type (effect, component, all)', 'all')
  .option('-l, --limit <number>', 'Limit results', '20')
  .option('--json', 'Output as JSON')
  .action(executeSearch);

export default executeSearch;
