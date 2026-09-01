/**
 * Template Service
 * 
 * Manages notification templates for SMS, Email, and Push notifications.
 * Supports variable substitution and template rendering.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface Template {
  id: string;
  name: string;
  channel: 'sms' | 'email' | 'push';
  subject?: string; // For email templates
  body: string;
  variables: string[]; // List of expected variables
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderResult {
  success: boolean;
  rendered?: string;
  subject?: string;
  error?: string;
  missingVariables?: string[];
}

// In-memory template cache for performance
const templateCache = new Map<string, Template>();

/**
 * Template Service class
 */
export class TemplateService {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
  }

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<Template> {
    // Check cache first
    if (templateCache.has(templateId)) {
      return templateCache.get(templateId)!;
    }

    // Determine channel and filename from template ID
    const [channel, ...nameParts] = templateId.split('-');
    const fileName = nameParts.join('-');
    
    let filePath: string;
    let content: string;
    
    try {
      switch (channel) {
        case 'sms':
          filePath = path.join(this.templatesDir, 'sms', `${fileName}.txt`);
          content = fs.readFileSync(filePath, 'utf-8');
          break;
        case 'email':
          filePath = path.join(this.templatesDir, 'email', `${fileName}.html`);
          content = fs.readFileSync(filePath, 'utf-8');
          break;
        case 'push':
          filePath = path.join(this.templatesDir, 'push', `${fileName}.json`);
          content = fs.readFileSync(filePath, 'utf-8');
          break;
        default:
          throw new Error(`Unknown template channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Template not found: ${templateId}`, { error });
      throw new Error(`Template not found: ${templateId}`);
    }

    // Extract variables from template (format: {variable_name})
    const variablePattern = /\{([^}]+)\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    // Extract subject for email templates (from <!-- Subject: ... --> comment)
    let subject: string | undefined;
    const subjectMatch = content.match(/<!--\s*Subject:\s*(.+?)\s*-->/);
    if (subjectMatch) {
      subject = subjectMatch[1];
    }

    const template: Template = {
      id: templateId,
      name: fileName,
      channel: channel as 'sms' | 'email' | 'push',
      subject,
      body: content,
      variables: Array.from(variables),
      createdAt: fs.statSync(filePath).birthtime,
      updatedAt: fs.statSync(filePath).mtime,
    };

    // Cache the template
    templateCache.set(templateId, template);

    return template;
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<RenderResult> {
    try {
      const template = await this.getTemplate(templateId);

      // Check for missing required variables
      const missingVariables: string[] = [];
      for (const variable of template.variables) {
        if (!(variable in data)) {
          missingVariables.push(variable);
        }
      }

      // Log warning but still render (missing vars will be left as-is)
      if (missingVariables.length > 0) {
        logger.warn(`Missing template variables for ${templateId}`, { missingVariables });
      }

      // Perform variable substitution
      let rendered = template.body;
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        rendered = rendered.replace(regex, String(value ?? ''));
      }

      // Also render subject if present
      let renderedSubject = template.subject;
      if (renderedSubject) {
        for (const [key, value] of Object.entries(data)) {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          renderedSubject = renderedSubject.replace(regex, String(value ?? ''));
        }
      }

      return {
        success: true,
        rendered,
        subject: renderedSubject,
        missingVariables: missingVariables.length > 0 ? missingVariables : undefined,
      };
    } catch (error) {
      logger.error(`Failed to render template: ${templateId}`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all available templates
   */
  async listTemplates(): Promise<Template[]> {
    const templates: Template[] = [];
    const channels = ['sms', 'email', 'push'];
    const extensions = { sms: '.txt', email: '.html', push: '.json' };

    for (const channel of channels) {
      const dirPath = path.join(this.templatesDir, channel);
      
      try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          if (path.extname(file) === extensions[channel as keyof typeof extensions]) {
            const templateId = `${channel}-${path.basename(file, extensions[channel as keyof typeof extensions])}`;
            try {
              const template = await this.getTemplate(templateId);
              templates.push(template);
            } catch {
              // Skip invalid templates
            }
          }
        }
      } catch {
        // Directory doesn't exist or is not readable
      }
    }

    return templates;
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    templateCache.clear();
    logger.info('Template cache cleared');
  }

  /**
   * Preload all templates into cache
   */
  async preloadTemplates(): Promise<number> {
    const templates = await this.listTemplates();
    for (const template of templates) {
      templateCache.set(template.id, template);
    }
    logger.info(`Preloaded ${templates.length} templates into cache`);
    return templates.length;
  }

  /**
   * Validate template syntax
   */
  validateTemplateSyntax(content: string): { valid: boolean; errors: string[]; variables: string[] } {
    const errors: string[] = [];
    const variables: string[] = [];

    // Check for unbalanced braces
    let openBraces = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '{') {
        openBraces++;
      } else if (content[i] === '}') {
        openBraces--;
        if (openBraces < 0) {
          errors.push(`Unmatched closing brace at position ${i}`);
        }
      }
    }
    if (openBraces !== 0) {
      errors.push('Unbalanced braces in template');
    }

    // Extract and validate variables
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let match;
    while ((match = variablePattern.exec(content)) !== null) {
      variables.push(match[1]);
    }

    // Check for invalid variable names
    const invalidPattern = /\{[^a-zA-Z_][^}]*\}/g;
    while ((match = invalidPattern.exec(content)) !== null) {
      errors.push(`Invalid variable name: ${match[0]}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      variables: [...new Set(variables)],
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();