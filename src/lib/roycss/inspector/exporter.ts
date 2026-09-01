/**
 * Exporter - Export Inspected Elements
 * @module roycss/inspector/exporter
 * @description Export functionality for inspected elements
 */

import { InspectedElement } from './index';

/** Export format types */
type ExportFormat = 'html' | 'css' | 'json' | 'react' | 'vue';

/** Export options */
interface ExportOptions {
  includeChildren?: boolean;
  includeStyles?: boolean;
  minify?: boolean;
  prettyPrint?: boolean;
  includeComments?: boolean;
}

/**
 * Export element in specified format
 */
export function exportElement(
  element: InspectedElement, 
  format: ExportFormat = 'html',
  options: ExportOptions = {}
): string {
  switch (format) {
    case 'html':
      return exportAsHTML(element, options);
    case 'css':
      return exportAsCSS(element, options);
    case 'json':
      return exportAsJSON(element, options);
    case 'react':
      return exportAsReact(element, options);
    case 'vue':
      return exportAsVue(element, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export as HTML
 */
export function exportAsHTML(element: InspectedElement, options: ExportOptions = {}): string {
  const el = element.element;
  const { includeComments = true, includeStyles = true } = options;
  
  let html = '';
  
  if (includeComments) {
    html += `<!-- ${element.tagName}${element.id ? '#' + element.id : ''}.${element.classes.join('.')} -->\n`;
  }
  
  // Clone element to avoid modifying original
  const clone = el.cloneNode(true) as HTMLElement;
  
  html += clone.outerHTML;
  
  return html;
}

/**
 * Export as CSS
 */
export function exportAsCSS(element: InspectedElement, options: ExportOptions = {}): string {
  const { prettyPrint = true, includeComments = true } = options;
  
  let css = '';
  
  if (includeComments) {
    css += `/* Styles for ${getElementSelector(element)} */\n`;
  }
  
  // Build selector
  const selector = getElementSelector(element);
  css += `${selector} {\n`;
  
  // Add computed styles (filtered to useful ones)
  const importantProps = [
    'display', 'position', 'width', 'height',
    'margin', 'padding', 'border',
    'background-color', 'color',
    'font-size', 'font-family', 'font-weight',
    'flex-direction', 'justify-content', 'align-items',
    'transform', 'transition', 'opacity',
    'box-shadow', 'border-radius'
  ];
  
  for (const prop of importantProps) {
    const value = element.computedStyles[prop];
    if (value && value !== 'initial' && value !== 'inherit' && value !== '') {
      css += `  ${prop}: ${value};\n`;
    }
  }
  
  css += '}\n';
  
  return css;
}

/**
 * Export as JSON
 */
export function exportAsJSON(element: InspectedElement, options: ExportOptions = {}): string {
  const { prettyPrint = true } = options;
  
  const data = {
    selector: getElementSelector(element),
    tagName: element.tagName,
    id: element.id,
    classes: element.classes,
    inlineStyles: element.inlineStyles,
    computedStyles: filterImportantStyles(element.computedStyles),
    boxModel: element.boxModel,
    accessibility: element.accessibility
  };
  
  return JSON.stringify(data, null, prettyPrint ? 2 : 0);
}

/**
 * Export as React JSX
 */
export function exportAsReact(element: InspectedElement, options: ExportOptions = {}): string {
  const { includeComments = true } = options;
  
  const el = element.element;
  const props = buildReactProps(element);
  const children = el.innerHTML.trim() || undefined;
  
  let jsx = '';
  
  if (includeComments) {
    jsx += `{/* ${element.tagName}${element.id ? '#' + element.id : ''} */}\n`;
  }
  
  jsx += `<${getComponentName(element.tagName)}`;
  
  // Add props
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.includes(' ')) {
      jsx += `\n  ${key}="${value}"`;
    } else {
      jsx += ` ${key}={${JSON.stringify(value)}}`;
    }
  }
  
  if (children && !voidElements.includes(element.tagName)) {
    jsx += `>\n  ${children}\n</${getComponentName(element.tagName)}>`;
  } else {
    jsx += ' />';
  }
  
  return jsx;
}

/**
 * Export as Vue template
 */
export function exportAsVue(element: InspectedElement, options: ExportOptions = {}): string {
  const { includeComments = true } = options;
  
  const el = element.element;
  const attrs = buildVueAttributes(element);
  const children = el.innerHTML.trim() || undefined;
  
  let vue = '';
  
  if (includeComments) {
    vue += `<!-- ${element.tagName}${element.id ? '#' + element.id : ''} -->\n`;
  }
  
  vue += `<${element.tagName}`;
  
  // Add attributes
  for (const [key, value] of Object.entries(attrs)) {
    vue += ` ${key}="${value}"`;
  }
  
  if (children && !voidElements.includes(element.tagName)) {
    vue += `>${children}</${element.tagName}>`;
  } else {
    vue += ' />';
  }
  
  return vue;
}

/** Void elements that don't need closing tags */
const voidElements = ['IMG', 'INPUT', 'BR', 'HR', 'AREA', 'BASE', 'COL', 'EMBED', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'];

/**
 * Build React props from element
 */
function buildReactProps(element: InspectedElement): Record<string, string> {
  const props: Record<string, string> = {};
  const el = element.element;
  
  // ID
  if (el.id) props.id = el.id;
  
  // Classes
  if (el.className) props.className = typeof el.className === 'string' ? el.className : '';
  
  // Style (only non-default values)
  const styleProps: Record<string, string> = {};
  const styleWhitelist = [
    'display', 'position', 'width', 'height',
    'backgroundColor', 'color', 'fontSize',
    'padding', 'margin', 'borderRadius',
    'flexDirection', 'justifyContent', 'alignItems'
  ];
  
  for (const prop of styleWhitelist) {
    const value = element.computedStyles[prop];
    if (value && value !== 'initial') {
      // Convert to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      styleProps[camelProp] = value;
    }
  }
  
  if (Object.keys(styleProps).length > 0) {
    props.style = JSON.stringify(styleProps);
  }
  
  return props;
}

/**
 * Build Vue attributes from element
 */
function buildVueAttributes(element: InspectedElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  const el = element.element;
  
  if (el.id) attrs[':id'] = `'${el.id}'`;
  if (typeof el.className === 'string' && el.className) {
    attrs['class'] = el.className;
  }
  
  return attrs;
}

/**
 * Get component name for React
 */
function getComponentName(tagName: string): string {
  const componentMap: Record<string, string> = {
    'DIV': 'div',
    'SPAN': 'span',
    'P': 'p',
    'A': 'a',
    'BUTTON': 'button',
    'IMG': 'img',
    'INPUT': 'input',
    'FORM': 'form',
    'UL': 'ul',
    'OL': 'ol',
    'LI': 'li',
    'H1': 'h1',
    'H2': 'h2',
    'H3': 'h3',
    'H4': 'h4',
    'H5': 'h5',
    'H6': 'h6',
    'SECTION': 'section',
    'ARTICLE': 'article',
    'HEADER': 'header',
    'FOOTER': 'footer',
    'NAV': 'nav',
    'MAIN': 'main',
    'ASIDE': 'aside'
  };
  
  return componentMap[tagName.toUpperCase()] || tagName.toLowerCase();
}

/**
 * Get element selector string
 */
function getElementSelector(element: InspectedElement): string {
  let selector = element.tagName;
  if (element.id) selector += `#${element.id}`;
  if (element.classes.length) selector += `.${element.classes.join('.')}`;
  return selector;
}

/**
 * Filter to important CSS properties
 */
function filterImportantStyles(styles: Record<string, string>): Record<string, string> {
  const important = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'background-color', 'color',
    'font-size', 'font-family', 'font-weight', 'line-height', 'text-align',
    'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
    'transform', 'transition', 'opacity',
    'box-shadow', 'border-radius', 'overflow'
  ];
  
  const filtered: Record<string, string> = {};
  for (const prop of important) {
    if (styles[prop]) {
      filtered[prop] = styles[prop];
    }
  }
  
  return filtered;
}
