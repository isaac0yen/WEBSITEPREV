import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { BaseAdapter } from './base.js';

class FilesystemAdapter extends BaseAdapter {
  constructor(options, env, projectRoot) {
    super(options, env);
    this.projectRoot = projectRoot;
  }

  async upload(filePath, name, outputPath) {
    const resolvedOutputPath = resolve(this.projectRoot, outputPath);
    const outputDir = dirname(resolvedOutputPath);
    
    // Create intermediate directories
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Copy the temp file to the destination
    copyFileSync(filePath, resolvedOutputPath);
    
    return {
      url: null,
      path: resolvedOutputPath
    };
  }

  getExpectedUrl(name) {
    return null;
  }
}

export { FilesystemAdapter };
