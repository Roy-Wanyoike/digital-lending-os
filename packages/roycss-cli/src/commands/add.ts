/**
 * Add Command
 * @module roycss-cli/commands/add
 * @description Add effects or components to a project
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { logger, createSpinner } from '../utils/logger';

/** Available effects registry */
const EFFECTS_REGISTRY: Record<string, { css: string; description: string }> = {
  'bounce': {
    description: 'Bouncing animation effect',
    css: `.roy-bounce {\n  animation: roy-bounce 0.6s ease-in-out;\n}\n\n@keyframes roy-bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}\n`
  },
  'fade-in': {
    description: 'Fade in on appear effect',
    css: `.roy-fade-in {\n  opacity: 0;\n  animation: roy-fade-in 0.5s ease-out forwards;\n}\n\n@keyframes roy-fade-in {\n  to { opacity: 1; }\n}\n`
  },
  'fade-out': {
    description: 'Fade out on leave effect',
    css: `.roy-fade-out {\n  animation: roy-fade-out 0.5s ease-out forwards;\n}\n\n@keyframes roy-fade-out {\n  from { opacity: 1; }\n  to { opacity: 0; }\n}\n`
  },
  'slide-up': {
    description: 'Slide up entrance effect',
    css: `.roy-slide-up {\n  transform: translateY(20px);\n  opacity: 0;\n  animation: roy-slide-up 0.4s ease-out forwards;\n}\n\n@keyframes roy-slide-up {\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n`
  },
  'slide-down': {
    description: 'Slide down entrance effect',
    css: `.roy-slide-down {\n  transform: translateY(-20px);\n  opacity: 0;\n  animation: roy-slide-down 0.4s ease-out forwards;\n}\n\n@keyframes roy-slide-down {\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n`
  },
  'slide-left': {
    description: 'Slide left entrance effect',
    css: `.roy-slide-left {\n  transform: translateX(20px);\n  opacity: 0;\n  animation: roy-slide-left 0.4s ease-out forwards;\n}\n\n@keyframes roy-slide-left {\n  to {\n    transform: translateX(0);\n      opacity: 1;\n    }\n}\n`
  },
  'slide-right': {
    description: 'Slide right entrance effect',
    css: `.roy-slide-right {\n  transform: translateX(-20px);\n  opacity: 0;\n  animation: roy-slide-right 0.4s ease-out forwards;\n}\n\n@keyframes roy-slide-right {\n  to {\n      transform: translateX(0);\n      opacity: 1;\n    }\n}\n`
  },
  'zoom-in': {
    description: 'Zoom in entrance effect',
    css: `.roy-zoom-in {\n  transform: scale(0.9);\n  opacity: 0;\n  animation: roy-zoom-in 0.3s ease-out forwards;\n}\n\n@keyframes roy-zoom-in {\n  to {\n    transform: scale(1);\n    opacity: 1;\n  }\n}\n`
  },
  'zoom-out': {
    description: 'Zoom out exit effect',
    css: `.roy-zoom-out {\n  animation: roy-zoom-out 0.3s ease-out forwards;\n}\n\n@keyframes roy-zoom-out {\n  to {\n    transform: scale(0.9);\n    opacity: 0;\n  }\n}\n`
  },
  'rotate-in': {
    description: 'Rotate in entrance effect',
    css: `.roy-rotate-in {\n  transform: rotate(-180deg) scale(0);\n  opacity: 0;\n  animation: roy-rotate-in 0.6s ease-out forwards;\n}\n\n@keyframes roy-rotate-in {\n  to {\n    transform: rotate(0) scale(1);\n    opacity: 1;\n  }\n}\n`
  },
  'pulse': {
    description: 'Pulsing/glowing attention effect',
    css: `.roy-pulse {\n  animation: roy-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n}\n\n@keyframes roy-pulse {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.5; }\n}\n`
  },
  'shake': {
    description: 'Shaking error/alert effect',
    css: `.roy-shake {\n  animation: roy-shake 0.5s ease-in-out;\n}\n\n@keyframes roy-shake {\n  0%, 100% { transform: translateX(0); }\n  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }\n  20%, 40%, 60%, 80% { transform: translateX(5px); }\n}\n`
  },
  'spin': {
    description: 'Continuous spinning effect',
    css: `.roy-spin {\n  animation: roy-spin 1s linear infinite;\n}\n\n@keyframes roy-spin {\n  from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }\n}\n`
  },
  'ping': {
    description: 'Ping/radar notification effect',
    css: `.roy-ping {\n  position: relative;\n}\n\n.roy-ping::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  animation: roy-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;\n}\n\n@keyframes roy-ping {\n  75%, 100% {\n    transform: scale(2);\n    opacity: 0;\n  }\n}\n`
  },
  'float': {
    description: 'Floating/bobbing effect',
    css: `.roy-float {\n  animation: roy-float 3s ease-in-out infinite;\n}\n\n@keyframes roy-float {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}\n`
  },
  'glow': {
    description: 'Glowing box-shadow effect',
    css: `.roy-glow {\n  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);\n  transition: box-shadow 0.3s ease;\n}\n\n.roy-glow:hover,\n.roy-glow.active {\n  box-shadow: 0 0 20px rgba(59, 130, 246, 0.8),\n                0 0 40px rgba(59, 130, 246, 0.4);\n}\n`
  },
  'hover-lift': {
    description: 'Lift up on hover effect',
    css: `.roy-hover-lift {\n  transition: transform 0.3s ease, box-shadow 0.3s ease;\n}\n\n.roy-hover-lift:hover {\n  transform: translateY(-5px);\n  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);\n}\n`
  },
  'gradient-text': {
    description: 'Gradient text effect',
    css: `.roy-gradient-text {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  background-clip: text;\n}\n`
  },
  'underline-gradient': {
    description: 'Animated gradient underline effect',
    css: `.roy-underline-gradient {\n  position: relative;\n  text-decoration: none;\n}\n\n.roy-underline-gradient::after {\n  content: '';\n  position: absolute;\n  bottom: -2px;\n  left: 0;\n  width: 100%;\n  height: 2px;\n  background: linear-gradient(90deg, #667eea, #764ba2);\n  transform: scaleX(0);\n  transition: transform 0.3s ease;\n}\n\n.roy-underline-gradient:hover::after {\n  transform: scaleX(1);\n}\n`
  }
};

/** Component registry */
const COMPONENTS_REGISTRY: Record<string, { css: string; html: string; description: string }> = {
  'button': {
    description: 'Modern button component',
    html: `<button class="roy-button roy-button--primary">Button</button>`,
    css: `.roy-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n  font-weight: 500;\n  border-radius: 0.5rem;\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.roy-button--primary {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n}\n\n.roy-button:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}`
  },
  'card': {
    description: 'Card container component',
    html: `<article class="roy-card">\n  <div class="roy-card__body">Card content</div>\n</article>`,
    css: `.roy-card {\n  background: white;\n  border-radius: 1rem;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n  overflow: hidden;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.roy-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);\n}\n\n.roy-card__body {\n  padding: 1.5rem;\n}`
  },
  'input': {
    description: 'Form input field component',
    html: `<input class="roy-input" type="text" placeholder="Enter text..." />`,
    css: `.roy-input {\n  padding: 0.75rem 1rem;\n  font-size: 1rem;\n  border: 2px solid #e5e7eb;\n  border-radius: 0.5rem;\n  transition: border-color 0.2s, box-shadow 0.2s;\n}\n\n.roy-input:focus {\n  outline: none;\n  border-color: #667eea;\n  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);\n}`
  }
};

/** Add options */
interface AddOptions {
  type?: 'effect' | 'component' | 'all';
  output?: string;
  list?: boolean;
}

/**
 * List available items
 */
function listAvailable(type?: string): void {
  logger.header(type === 'component' ? 'Available Components' : 'Available Effects');
  
  const items = type === 'component' ? COMPONENTS_REGISTRY : EFFECTS_REGISTRY;
  
  const headers = ['Name', 'Description'];
  const rows = Object.entries(items).map(([name, item]) => [
    name,
    item.description
  ]);
  
  logger.table(headers, rows);
  logger.info(`Total: ${Object.keys(items).length} items`);
}

/**
 * Execute add command
 */
export async function executeAdd(name: string, options: AddOptions): Promise<void> {
  // Handle list flag
  if (options.list) {
    listAvailable(options.type);
    return;
  }

  if (!name) {
    logger.error('Please specify an effect or component name.');
    logger.info('Use "roycss add --list" to see available items.');
    return;
  }

  const targetDir = process.cwd();
  const effectsDir = path.join(targetDir, 'src/styles/roycss/effects');
  const componentsDir = path.join(targetDir, 'src/styles/roycss/components');

  // Normalize name
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Check what we're adding
  let itemType: 'effect' | 'component' = options.type === 'component' ? 'component' : 'effect';
  let registry: typeof EFFECTS_REGISTRY | typeof COMPONENTS_REGISTRY = EFFECTS_REGISTRY;
  let outputDir = effectsDir;

  if (options.type === 'component' || COMPONENTS_REGISTRY[normalizedName]) {
    if (!COMPONENTS_REGISTRY[normalizedName] && !EFFECTS_REGISTRY[normalizedName]) {
      logger.error(`Component "${normalizedName}" not found.`);
      return;
    }
    if (COMPONENTS_REGISTRY[normalizedName]) {
      itemType = 'component';
      registry = COMPONENTS_REGISTRY;
      outputDir = componentsDir;
    }
  }

  // Look up in registry
  const item = registry[normalizedName];
  
  if (!item) {
    // Try fuzzy search
    const matches = Object.keys(registry).filter(key => 
      key.includes(normalizedName) || normalizedName.includes(key)
    );
    
    if (matches.length > 0) {
      logger.warning(`"${normalizedName}" not found. Did you mean:`);
      matches.forEach(m => logger.info(`  • ${m}`));
    } else {
      logger.error(`Effect/component "${normalizedName}" not found.`);
      logger.info('Use "roycss add --list" to see available items.');
    }
    return;
  }

  const spinner = createSpinner({
    text: `Adding ${itemType}: ${normalizedName}...`,
    successText: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} added successfully!`
  });

  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Write files
    const fileName = `${normalizedName}.css`;
    const filePath = path.join(outputDir, fileName);
    
    if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
      spinner.warn(`${fileName} already exists. Use --force to overwrite.`);
      return;
    }

    await fs.writeFile(filePath, item.css);

    // If component, also write HTML template
    if (itemType === 'component' && 'html' in item) {
      const htmlPath = path.join(outputDir, `${normalizedName}.html`);
      await fs.writeFile(htmlPath, item.html);
    }

    spinner.succeed();

    // Print usage info
    logger.blank();
    logger.info(`File: ${filePath}`);
    logger.info(`Description: ${item.description}`);
    logger.info('');
    logger.info('To use, add to your CSS:');
    logger.info(`  @import '${outputDir.replace(targetDir, '.')}/${fileName}';`);

  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : 'Failed to add item');
  }
}

/** Export command for Commander */
export const addCommand = new Command('add')
  .description('Add an effect or component to your project')
  .argument('[name]', 'Name of effect or component to add')
  .option('-t, --type <type>', 'Type to add (effect, component)', 'effect')
  .option('-o, --output <path>', 'Output directory')
  .option('-l, --list', 'List available effects and components')
  .action(executeAdd);

export default executeAdd;
