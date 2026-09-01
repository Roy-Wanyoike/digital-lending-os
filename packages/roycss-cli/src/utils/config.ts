/**
 * Configuration Utility
 * @module roycss-cli/utils/config
 * @description CLI configuration management
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/** ROYCSS config file name */
const CONFIG_FILENAME = '.roycssrc.json';

/** Configuration structure */
export interface RoyCSSConfig {
  version: number;
  effectsPath?: string;
  componentsPath?: string;
  outputFormat?: 'css' | 'tailwind' | 'styled-components';
  includePrefixes?: boolean;
  minifyOutput?: boolean;
  theme?: Record<string, unknown>;
  aliases?: Record<string, string>;
}

/** Default configuration */
const DEFAULT_CONFIG: RoyCSSConfig = {
  version: 1,
  outputFormat: 'css',
  includePrefixes: false,
  minifyOutput: false
};

/**
 * Config manager class
 */
class ConfigManager {
  private configPath: string;
  private cache: RoyCSSConfig | null = null;

  constructor(cwd?: string) {
    this.configPath = cwd 
      ? path.join(cwd, CONFIG_FILENAME)
      : path.join(process.cwd(), CONFIG_FILENAME);
  }

  /**
   * Get global config path
   */
  static getGlobalConfigPath(): string {
    return path.join(os.homedir(), '.config', 'roycss', CONFIG_FILENAME);
  }

  /**
   * Load configuration from file
   */
  load(): RoyCSSConfig {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readJsonSync(this.configPath);
        this.cache = { ...DEFAULT_CONFIG, ...raw };
        return this.cache;
      }
    } catch (error) {
      // Ignore read errors, use defaults
    }

    this.cache = { ...DEFAULT_CONFIG };
    return this.cache;
  }

  /**
   * Save configuration to file
   */
  save(config: Partial<RoyCSSConfig>): void {
    const current = this.load();
    this.cache = { ...current, ...config };
    fs.writeJsonSync(this.configPath, this.cache, { spaces: 2 });
  }

  /**
   * Get specific config value
   */
  get<K extends keyof RoyCSSConfig>(key: K): RoyCSSConfig[K] {
    return this.load()[key];
  }

  /**
   * Set specific config value
   */
  set<K extends keyof RoyCSSConfig>(key: K, value: RoyCSSConfig[K]): void {
    const config = this.load();
    config[key] = value;
    this.save(config);
  }

  /**
   * Check if config file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Initialize default config file
   */
  init(): void {
    if (!this.exists()) {
      this.save(DEFAULT_CONFIG);
    }
  }

  /**
   * Get config file path
   */
  getPath(): string {
    return this.configPath;
  }

  /**
   * Clear cached config
   */
  clearCache(): void {
    this.cache = null;
  }
}

// Export singleton factory
let instance: ConfigManager | null = null;

export function getConfig(cwd?: string): ConfigManager {
  if (!instance || cwd) {
    instance = new ConfigManager(cwd);
  }
  return instance;
}

export { ConfigManager, DEFAULT_CONFIG, CONFIG_FILENAME };
export default ConfigManager;
