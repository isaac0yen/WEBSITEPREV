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

This tool runs AFTER your deployment completes. It visits configured URLs,
captures screenshots, and saves them to either local filesystem or Cloudinary.

The key feature: URLs are deterministic. You can hardcode the Cloudinary URL
in your HTML before the first screenshot is even taken. Each run overwrites
the image in place, so your code never needs to change.

Examples:
  $ websiteprev init                    Create a config file
  $ websiteprev run                     Take all screenshots
  $ websiteprev run --dry-run           Preview without taking screenshots
  $ websiteprev url home                Get the deterministic URL for a shot
  $ websiteprev validate                Check config for errors

CI/CD Usage:
  Always deploy BEFORE running websiteprev:
    1. Build & deploy your site
    2. Run: npx websiteprev run
    3. Commit the manifest or use URLs in your app

Environment Variables (Cloudinary only):
  CLOUDINARY_CLOUD_NAME   Your cloud name
  CLOUDINARY_API_KEY      Your API key
  CLOUDINARY_API_SECRET   Your API secret`)
  .version('0.1.0');

// run command
program
  .command('run')
  .description(`Execute the full screenshot pipeline.

Visits each configured URL in a headless browser, captures a screenshot,
and uploads to the configured adapter (filesystem or Cloudinary).

After completion, writes websiteprev.manifest.json containing all shot
results and URLs. This file should be committed to your repository.

IMPORTANT: Run this AFTER your deployment completes. The tool screenshots
live URLs, so the site must be deployed first.`)
  .option('--config <path>', 'Path to config file (default: ./websiteprev.config.json)')
  .option('--dry-run', 'Validate config and print what would run without taking screenshots. Use this to verify your setup before running in CI.')
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

Generates a config with the filesystem adapter and two example shots.
Edit the file to configure your URLs, then run 'websiteprev run'.

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

Checks that all required fields are present and correctly formatted.
Use this in CI to catch config errors before the deploy step.`)
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

This is how you discover the URL to hardcode in your HTML before your
first run. The URL is computed from your config and never changes.

For Cloudinary: prints the full URL
  Example: home → https://res.cloudinary.com/mycloud/image/upload/folder/home.png

For filesystem: prints the local output path
  Example: home → screenshots/home.png (local path)

You can safely use this URL in your code immediately. When you run
'websiteprev run', the image will be uploaded to exactly this location.`)
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
