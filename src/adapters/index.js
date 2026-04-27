import { FilesystemAdapter } from './filesystem.js';
import { CloudinaryAdapter } from './cloudinary.js';

export function createAdapter(storage, env, projectRoot) {
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
