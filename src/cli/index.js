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
  .description('Capture website screenshots after deployment')
  .version('0.1.0');

// run command
program
  .command('run')
  .description('Run the full screenshot pipeline')
  .option('--config <path>', 'Path to config file', './websiteprev.config.json')
  .option('--dry-run', 'Validate config and print what would run without taking screenshots')
  .action(async (options) => {
    try {
      const result = await run({
        config: options.config,
        env: process.env,
        dryRun: options.dryRun
      });
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// init command
program
  .command('init')
  .description('Create a template websiteprev.config.json file')
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
  .description('Validate the config file')
  .option('--config <path>', 'Path to config file', './websiteprev.config.json')
  .action(async (options) => {
    try {
      await loadConfig(options.config);
      console.log('Config is valid.');
      process.exit(0);
    } catch (error) {
      console.error(`Validation failed:\n${error.message}`);
      process.exit(1);
    }
  });

// url command
program
  .command('url <name>')
  .description('Print the deterministic URL for a named shot')
  .option('--config <path>', 'Path to config file', './websiteprev.config.json')
  .action(async (name, options) => {
    try {
      const config = await loadConfig(options.config);
      const adapter = createAdapter(config.storage, process.env, config._projectRoot);
      
      const shot = config.shots.find(s => s.name === name);
      if (!shot) {
        console.error(`Shot "${name}" not found in config.`);
        process.exit(1);
      }
      
      const expectedUrl = adapter.getExpectedUrl(name);
      
      if (expectedUrl) {
        console.log(`${name} → ${expectedUrl}`);
      } else {
        // Filesystem adapter - show local path
        console.log(`${name} → ${shot.output} (local path)`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
