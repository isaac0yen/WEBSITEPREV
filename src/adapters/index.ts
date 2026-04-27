import { FilesystemAdapter } from './filesystem.js';
import { CloudinaryAdapter } from './cloudinary.js';
import { BaseAdapter } from './base.js';
import type { StorageConfig } from '../types/index.js';

export function createAdapter(storage: StorageConfig, env: Record<string, string | undefined>, projectRoot: string): BaseAdapter {
  const { adapter, options } = storage;
  
  switch (adapter) {
    case 'filesystem':
      return new FilesystemAdapter(options, env, projectRoot);
    case 'cloudinary':
      return new CloudinaryAdapter(options, env);
    default:
      throw new Error(`Unknown adapter: ${adapter}`);
  }
}

export { BaseAdapter } from './base.js';
export { FilesystemAdapter } from './filesystem.js';
export { CloudinaryAdapter } from './cloudinary.js';
