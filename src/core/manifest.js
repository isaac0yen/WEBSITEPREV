import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';

export async function writeManifest(configPath, data) {
  const manifestPath = resolve(dirname(configPath), 'websiteprev.manifest.json');
  
  const manifest = {
    generated: new Date().toISOString(),
    adapter: data.adapter,
    shots: data.shots
  };
  
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  
  return manifestPath;
}

export async function readManifest(projectRoot) {
  const manifestPath = resolve(projectRoot, 'websiteprev.manifest.json');
  
  if (!existsSync(manifestPath)) {
    return null;
  }
  
  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content);
}
