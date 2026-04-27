import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { BaseAdapter } from './base.js';
import type { AdapterUploadResult } from '../types/index.js';

export class FilesystemAdapter extends BaseAdapter {
  private projectRoot: string;

  constructor(options: Record<string, unknown> | undefined, env: Record<string, string | undefined>, projectRoot: string) {
    super(options, env);
    this.projectRoot = projectRoot;
  }

  async upload(filePath: string, name: string, outputPath: string): Promise<AdapterUploadResult> {
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

  getExpectedUrl(_name: string): null {
    return null;
  }
}
