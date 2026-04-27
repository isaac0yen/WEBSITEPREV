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
  .description(`Capture website screenshots after deployment.

WHY THIS EXISTS:
You want a screenshot of your live site in your OG image tags, README, or app UI.
But there's a timing problem: you need the image URL BEFORE you can write your HTML,
yet the screenshot can only be taken AFTER deployment. This tool solves that paradox.

THE CORE CONCEPT:
The image URL is deterministic and knowable in advance. When using Cloudinary,
the URL follows a predictable formula:
  https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{name}.png

You define all these values in your config. The URL never changes. Each run
overwrites the image in place, so your HTML never needs updating.

HOW IT FITS IN YOUR PIPELINE:
  1. Build your project
  2. Deploy to production/staging
  3. Run: npx websiteprev run  (screenshots the LIVE deployed site)
  4. The manifest file is updated with current URLs

The manifest (websiteprev.manifest.json) is the bridge between CI runs and your
codebase. Commit it. Read it at build time. Your app always has current URLs.

THREE WAYS TO USE THE URLS:
  1. Hardcode: Run 'websiteprev url <name>' to get the URL, paste in HTML once
  2. Manifest-driven: Import the manifest at build time, inject URLs dynamically
  3. Proxy route: Serve URLs via an API route that reads the manifest at runtime

Examples:
  $ websiteprev init                    Create a config file
  $ websiteprev run                     Take all screenshots
  $ websiteprev run --dry-run           Preview without taking screenshots
  $ websiteprev url home                Get the deterministic URL for a shot
  $ websiteprev validate                Check config for errors

Environment Variables (Cloudinary only):
  CLOUDINARY_CLOUD_NAME   Your cloud name
  CLOUDINARY_API_KEY      Your API key
  CLOUDINARY_API_SECRET   Your API secret`)
  .version('0.1.0');

// run command
program
  .command('run')
  .description(`Execute the full screenshot pipeline.

WHAT HAPPENS:
For each shot in your config, this command:
  1. Launches a headless browser
  2. Navigates to the configured URL
  3. Waits for the page to stabilize (configurable)
  4. Captures a screenshot
  5. Uploads to filesystem or Cloudinary
  6. Records the result in the manifest

WHY IT MUST RUN AFTER DEPLOYMENT:
This tool screenshots LIVE URLs. If your deployment hasn't completed, you'll
capture the old version or get a connection error. The deployment step is YOUR
responsibility — this tool just visits whatever is currently at the URL.

THE MANIFEST FILE:
After completion, websiteprev.manifest.json is written to your project root.
It contains every shot's status and URL. This file should be committed to your
repository. It's how your build process or app knows where the images live.

ERROR HANDLING:
If one shot fails, the others continue. All errors are recorded in the manifest.
Exit code is 0 if all succeeded, 1 if any failed. This lets CI fail gracefully.`)
  .option('--config <path>', 'Path to config file (default: ./websiteprev.config.json)')
  .option('--dry-run', `Validate config and print what would run without taking screenshots.

Use this to:
  - Verify your config is correct before running in CI
  - See the deterministic URLs that will be generated
  - Debug adapter configuration without making network calls

No browser is launched. No uploads happen. Pure validation and preview.`)
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
  .description(`Create a template websiteprev.config.json file.

WHAT YOU GET:
A config with sensible defaults:
  - Filesystem adapter (no external services needed)
  - Two example shots to show the structure
  - Browser settings optimized for most sites

NEXT STEPS:
  1. Edit the URLs to match your site
  2. Change the adapter to 'cloudinary' if you want CDN URLs
  3. Add more shots for different pages/viewport sizes
  4. Run 'websiteprev run' to capture

The config file should be committed to your repository.`)
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
  .description(`Validate the config file without running any screenshots.

WHAT IT CHECKS:
  - Required fields are present (storage.adapter, shots array)
  - Shot names are valid (lowercase, hyphens only)
  - URLs are strings
  - Browser settings have correct types
  - Cloudinary adapter has folder configured

WHEN TO USE:
  - In CI before the deploy step (catch config errors early)
  - After editing the config (verify before running)
  - In a pre-commit hook (prevent invalid configs)

Exit code 0 = valid, 1 = invalid. Easy to use in scripts.`)
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
  .description(`Print the deterministic URL for a named shot.

THE KEY INSIGHT:
The URL is computed from your config, not generated by the upload service.
This means you can know the URL before any screenshot exists. You can put
this URL in your HTML today, and the image will appear there after your
first CI run.

FOR CLOUDINARY:
Prints the full CDN URL. This URL will work forever. Each run overwrites
the image at this exact location. The URL never changes.

  Example: home → https://res.cloudinary.com/mycloud/image/upload/folder/home.png

FOR FILESYSTEM:
Prints the local output path. This is where the file will be written.
Use this path in your code to reference the screenshot.

  Example: home → screenshots/home.png (local path)

USE CASES:
  1. First-time setup: Get the URL to hardcode in your HTML
  2. Debugging: Verify the URL matches what you expect
  3. Documentation: Show where images will be stored`)
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
