import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Manifest, ShotResult } from '../types/index.js';

export async function writeManifest(configPath: string, adapter: string, shots: ShotResult[]): Promise<string> {
  const manifestPath = resolve(dirname(configPath), 'websiteprev.manifest.json');
  
  const manifest: Manifest = {
    generated: new Date().toISOString(),
    adapter,
    shots
  };
  
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  
  return manifestPath;
}

export async function readManifest(projectRoot: string): Promise<Manifest | null> {
  const manifestPath = resolve(projectRoot, 'websiteprev.manifest.json');
  
  if (!existsSync(manifestPath)) {
    return null;
  }
  
  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as Manifest;
}
