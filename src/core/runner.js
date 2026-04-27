import { loadConfig } from './config.js';
import { takeScreenshot } from './screenshot.js';
import { writeManifest } from './manifest.js';
import { createAdapter } from '../adapters/index.js';

export async function run(options = {}) {
  const { config: configPath, env, dryRun = false } = options;
  
  // Load and validate config
  const config = await loadConfig(configPath);
  const adapter = createAdapter(config.storage, env, config._projectRoot);
  
  console.log(`Loaded config from: ${config._configPath}`);
  console.log(`Adapter: ${config.storage.adapter}`);
  console.log(`Shots: ${config.shots.length}`);
  
  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    for (const shot of config.shots) {
      const expectedUrl = adapter.getExpectedUrl(shot.name);
      console.log(`\nShot: ${shot.name}`);
      console.log(`  URL: ${shot.url}`);
      console.log(`  Output: ${shot.output}`);
      console.log(`  Expected: ${expectedUrl || `local path: ${shot.output}`}`);
    }
    console.log('\nDry run complete. No screenshots taken.');
    return { success: true, dryRun: true };
  }
  
  // Process each shot
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const shot of config.shots) {
    console.log(`\nProcessing: ${shot.name} (${shot.url})`);
    
    // Take screenshot
    const screenshotResult = await takeScreenshot(shot, config.browser);
    
    if (!screenshotResult.success) {
      console.error(`  Screenshot failed: ${screenshotResult.error}`);
      results.push({
        name: shot.name,
        url: shot.url,
        output: shot.output,
        remoteUrl: adapter.getExpectedUrl(shot.name),
        status: 'error',
        error: screenshotResult.error
      });
      errorCount++;
      continue;
    }
    
    // Upload via adapter
    try {
      const uploadResult = await adapter.upload(
        screenshotResult.tempPath,
        shot.name,
        shot.output
      );
      
      console.log(`  Uploaded to: ${uploadResult.url || uploadResult.path}`);
      
      results.push({
        name: shot.name,
        url: shot.url,
        output: shot.output,
        remoteUrl: uploadResult.url,
        status: 'success'
      });
      successCount++;
    } catch (error) {
      console.error(`  Upload failed: ${error.message}`);
      results.push({
        name: shot.name,
        url: shot.url,
        output: shot.output,
        remoteUrl: adapter.getExpectedUrl(shot.name),
        status: 'error',
        error: error.message
      });
      errorCount++;
    }
  }
  
  // Write manifest
  const manifestPath = await writeManifest(config._configPath, {
    adapter: config.storage.adapter,
    shots: results
  });
  
  console.log(`\nManifest written to: ${manifestPath}`);
  console.log(`\nSummary: ${successCount} succeeded, ${errorCount} failed`);
  
  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    manifestPath,
    results
  };
}
