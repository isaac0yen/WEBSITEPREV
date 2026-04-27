#!/usr/bin/env node

import { Command } from 'commander';
import { run } from '../core/runner.js';
import { loadConfig } from '../core/config.js';
import { createAdapter } from '../adapters/index.js';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const program = new Command();

program
  .name('websiteprev')
  .description(`Capture website screenshots after deployment in CI/CD.

THE PROBLEM:
You need screenshot URLs in your code BEFORE deployment, but screenshots can
only be taken AFTER deployment. This tool solves it with deterministic URLs.

HOW IT WORKS:

For Cloudinary (CDN):
  1. Create config, run 'websiteprev url home' to get the URL
  2. Hardcode that URL in your OG tags: <meta property="og:image" content="https://...">
  3. Commit and push
  4. CI deploys, then runs 'websiteprev run' to upload screenshot to that exact URL
  5. Done. Every deploy updates the image, URL never changes.

For Filesystem (local files):
  1. Create config with output paths like 'public/images/home.png'
  2. Reference that path in your code: <img src="/images/home.png">
  3. Commit and push
  4. CI deploys, then runs 'websiteprev run' to generate the file
  5. Done. File is in your build output, path never changes.

THIS RUNS IN CI, NOT LOCALLY:
Running locally defeats the purpose — you'd screenshot localhost instead of
your live production site. The correct CI sequence is:
  Build → Deploy → Run websiteprev → Commit manifest → Push

Commands:
  $ websiteprev init           Create config file
  $ websiteprev url <name>     Get deterministic URL (before first run)
  $ websiteprev run            Take screenshots (in CI after deploy)
  $ websiteprev validate       Check config (locally before commit)

GitHub Secrets (Cloudinary only):
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  Set in: Settings > Secrets and variables > Actions`)
  .version('0.1.0');

// run command
program
  .command('run')
  .description(`Take screenshots of live deployed site (CI only).

RUNS IN CI AFTER DEPLOYMENT:
This screenshots your LIVE production URLs. Running locally is pointless —
you'd screenshot localhost. The CI sequence is:
  1. Build → 2. Deploy → 3. Run this command → 4. Commit manifest

WHAT IT DOES:
  - Launches headless browser for each configured shot
  - Visits the live URL and captures screenshot
  - Uploads to Cloudinary or saves to filesystem
  - Writes websiteprev.manifest.json with results
  - Exit code 0 if all succeeded, 1 if any failed

THE MANIFEST:
Contains URLs and status for each shot. Must be committed back to repo after
this runs. Your app can import it to get current screenshot URLs dynamically.`)
  .option('--config <path>', 'Path to config file (default: ./websiteprev.config.json)')
  .option('--dry-run', 'Validate config and preview URLs without taking screenshots')
  .action(async (options) => {
    try {
      const result = await run({
        config: options.config,
        env: process.env,
        dryRun: options.dryRun
      });
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// init command
program
  .command('init')
  .description(`Create websiteprev.config.json template.

WORKFLOW AFTER INIT:
  1. Edit config with your production URLs and adapter choice
  2. Run 'websiteprev url <name>' to get deterministic URLs
  3. Hardcode those URLs in your OG tags or code
  4. Commit config + your code changes
  5. Push to trigger CI
  6. CI deploys then runs 'websiteprev run' to populate the URLs

Config should be committed to your repository.`)
  .action(() => {
    const configPath = resolve('./websiteprev.config.json');
    
    if (existsSync(configPath)) {
      console.log('websiteprev.config.json already exists. Not overwriting.');
      process.exit(1);
    }
    
    const template = {
      storage: {
        adapter: 'filesystem',
        options: {}
      },
      browser: {
        width: 1280,
        height: 800,
        fullPage: true,
        waitUntil: 'networkidle2',
        delayMs: 0
      },
      shots: [
        {
          url: 'https://example.com',
          name: 'home',
          output: 'screenshots/home.png'
        },
        {
          url: 'https://example.com/about',
          name: 'about',
          output: 'screenshots/about.png'
        }
      ]
    };
    
    writeFileSync(configPath, JSON.stringify(template, null, 2));
    console.log(`Created websiteprev.config.json`);
    console.log('Edit the file to configure your shots, then run: websiteprev run');
  });

// validate command
program
  .command('validate')
  .description(`Validate config file (local use, pre-commit hooks).

Checks required fields, shot names, URLs, and adapter settings.
Exit code 0 = valid, 1 = invalid.

Not needed in CI — 'run' command validates automatically.`)
  .option('--config <path>', 'Path to config file (default: ./websiteprev.config.json)')
  .action(async (options) => {
    try {
      await loadConfig(options.config);
      console.log('Config is valid.');
      process.exit(0);
    } catch (error) {
      console.error(`Validation failed:\n${(error as Error).message}`);
      process.exit(1);
    }
  });

// url command
program
  .command('url <name>')
  .description(`Get deterministic URL for a shot (before first CI run).

THE WORKFLOW:
  1. Create config with 'websiteprev init'
  2. Run this command to get the URL
  3. Hardcode URL in your OG tags: <meta property="og:image" content="...">
  4. Commit and push
  5. CI runs 'websiteprev run' to populate that URL with actual screenshot

The URL is computed from your config, not generated by the service.
For Cloudinary: full CDN URL that never changes.
For filesystem: local path like 'public/images/home.png'.`)
  .option('--config <path>', 'Path to config file (default: ./websiteprev.config.json)')
  .action(async (name, options) => {
    try {
      const config = await loadConfig(options.config);
      const adapter = createAdapter(config.storage, process.env, config._projectRoot!);
      
      const shot = config.shots.find(s => s.name === name);
      if (!shot) {
        console.error(`Shot "${name}" not found in config.`);
        process.exit(1);
      }
      
      const expectedUrl = adapter.getExpectedUrl(name);
      
      if (expectedUrl) {
        console.log(`${name} → ${expectedUrl}`);
      } else {
        console.log(`${name} → ${shot.output} (local path)`);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
