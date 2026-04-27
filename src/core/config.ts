import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Config, BrowserConfig, Shot } from '../types/index.js';

const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  width: 1280,
  height: 800,
  fullPage: true,
  waitUntil: 'networkidle2',
  delayMs: 0
};

function validateShot(shot: unknown, index: number): string[] {
  const errors: string[] = [];
  const s = shot as Record<string, unknown>;
  
  if (!s.url || typeof s.url !== 'string') {
    errors.push(`shots[${index}].url is required and must be a string`);
  }
  
  if (!s.name || typeof s.name !== 'string') {
    errors.push(`shots[${index}].name is required and must be a string`);
  } else if (!/^[a-z0-9-]+$/.test(s.name as string)) {
    errors.push(`shots[${index}].name must be lowercase with no spaces or special characters except hyphens`);
  }
  
  if (!s.output || typeof s.output !== 'string') {
    errors.push(`shots[${index}].output is required and must be a string`);
  }
  
  if (s.browser) {
    const b = s.browser as Record<string, unknown>;
    if (b.width !== undefined && typeof b.width !== 'number') {
      errors.push(`shots[${index}].browser.width must be a number`);
    }
    if (b.height !== undefined && typeof b.height !== 'number') {
      errors.push(`shots[${index}].browser.height must be a number`);
    }
    if (b.fullPage !== undefined && typeof b.fullPage !== 'boolean') {
      errors.push(`shots[${index}].browser.fullPage must be a boolean`);
    }
    if (b.waitUntil !== undefined && typeof b.waitUntil !== 'string') {
      errors.push(`shots[${index}].browser.waitUntil must be a string`);
    }
    if (b.delayMs !== undefined && typeof b.delayMs !== 'number') {
      errors.push(`shots[${index}].browser.delayMs must be a number`);
    }
  }
  
  return errors;
}

function validateConfig(config: unknown): string[] {
  const errors: string[] = [];
  const c = config as Record<string, unknown>;
  
  if (!c.storage || typeof c.storage !== 'object') {
    errors.push('storage is required and must be an object');
  } else {
    const storage = c.storage as Record<string, unknown>;
    if (!storage.adapter || !['filesystem', 'cloudinary'].includes(storage.adapter as string)) {
      errors.push('storage.adapter must be "filesystem" or "cloudinary"');
    }
    
    if (storage.adapter === 'cloudinary') {
      const options = storage.options as Record<string, unknown> | undefined;
      if (!options || !options.folder) {
        errors.push('storage.options.folder is required when adapter is "cloudinary"');
      }
    }
  }
  
  if (!c.shots || !Array.isArray(c.shots)) {
    errors.push('shots is required and must be an array');
  } else if (c.shots.length === 0) {
    errors.push('shots array must contain at least one shot');
  } else {
    c.shots.forEach((shot, index) => {
      errors.push(...validateShot(shot, index));
    });
  }
  
  if (c.browser) {
    const b = c.browser as Record<string, unknown>;
    if (b.width !== undefined && typeof b.width !== 'number') {
      errors.push('browser.width must be a number');
    }
    if (b.height !== undefined && typeof b.height !== 'number') {
      errors.push('browser.height must be a number');
    }
    if (b.fullPage !== undefined && typeof b.fullPage !== 'boolean') {
      errors.push('browser.fullPage must be a boolean');
    }
    if (b.waitUntil !== undefined && typeof b.waitUntil !== 'string') {
      errors.push('browser.waitUntil must be a string');
    }
    if (b.delayMs !== undefined && typeof b.delayMs !== 'number') {
      errors.push('browser.delayMs must be a number');
    }
  }
  
  return errors;
}

export async function loadConfig(configPath: string = './websiteprev.config.json'): Promise<Config> {
  const absolutePath = resolve(configPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`websiteprev.config.json not found. Run 'websiteprev init' to create one.`);
  }
  
  const content = await readFile(absolutePath, 'utf-8');
  let config: unknown;
  
  try {
    config = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in config file: ${(e as Error).message}`);
  }
  
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.join('\n')}`);
  }
  
  // Merge with defaults
  const typedConfig = config as Config;
  typedConfig.browser = { ...DEFAULT_BROWSER_CONFIG, ...typedConfig.browser };
  typedConfig.shots = typedConfig.shots.map(shot => ({
    ...shot,
    browser: { ...typedConfig.browser, ...shot.browser }
  }));
  
  typedConfig._projectRoot = dirname(absolutePath);
  typedConfig._configPath = absolutePath;
  
  return typedConfig;
}
