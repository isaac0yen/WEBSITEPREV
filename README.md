# websiteprev

[![npm version](https://badge.fury.io/js/websiteprev.svg)](https://www.npmjs.com/package/websiteprev)
[![GitHub](https://img.shields.io/github/license/isaac0yen/WEBSITEPREV)](https://github.com/isaac0yen/WEBSITEPREV)

Capture website screenshots after deployment in CI/CD. Language-agnostic — works with any project.

**This is a CI/CD tool.** It runs in your pipeline after deployment, not locally. Running it locally defeats the purpose — you'd screenshot localhost instead of your live production site.

## The Problem

You need screenshot URLs in your code BEFORE deployment, but screenshots can only be taken AFTER deployment. This tool solves it with deterministic URLs.

## How It Works

### For Cloudinary (CDN):
1. Create config, run `websiteprev url home` to get the URL
2. Hardcode that URL in your OG tags: `<meta property="og:image" content="https://...">`
3. Commit and push
4. CI deploys, then runs `websiteprev run` to upload screenshot to that exact URL
5. Done. Every deploy updates the image, URL never changes.

### For Filesystem (local files):
1. Create config with output paths like `public/images/home.png`
2. Reference that path in your code: `<img src="/images/home.png">`
3. Commit and push
4. CI deploys, then runs `websiteprev run` to generate the file
5. Done. File is in your build output, path never changes.

## Installation

```bash
npm install websiteprev
```

## Quick Start

```bash
# 1. Create config (locally)
npx websiteprev init

# 2. Edit websiteprev.config.json with your production URLs

# 3. Get deterministic URL (locally)
npx websiteprev url home
# Output: home → https://res.cloudinary.com/.../home.png

# 4. Hardcode that URL in your OG tags
# <meta property="og:image" content="https://res.cloudinary.com/.../home.png">

# 5. Commit and push

# 6. In CI (after deployment):
npx websiteprev run

# 7. CI commits manifest back to repo
git add websiteprev.manifest.json
git commit -m "Update screenshots [skip ci]"
git push
```

## CLI Commands

### `websiteprev init`

Creates `websiteprev.config.json` template. Do this locally, then follow the workflow above.

### `websiteprev url <name>`

Get deterministic URL for a shot. Run this locally before your first CI run to get the URL to hardcode in your code.

```bash
npx websiteprev url home
# Cloudinary: home → https://res.cloudinary.com/mycloud/image/upload/folder/home.png
# Filesystem: home → public/images/home.png (local path)
```

### `websiteprev run`

Take screenshots of live deployed site. Runs in CI after deployment, not locally.

```bash
npx websiteprev run
npx websiteprev run --config ./path/to/config.json
npx websiteprev run --dry-run  # Validate without taking screenshots
```

### `websiteprev validate`

Validate config file. For local use and pre-commit hooks. Not needed in CI.

## Config File Schema

Place `websiteprev.config.json` in your project root:

```json
{
  "storage": {
    "adapter": "cloudinary",
    "options": {
      "folder": "myapp/screenshots"
    }
  },
  "browser": {
    "width": 1280,
    "height": 800,
    "fullPage": true,
    "waitUntil": "networkidle2",
    "delayMs": 0
  },
  "shots": [
    {
      "url": "https://myapp.com",
      "name": "home",
      "output": "public/images/home.png"
    },
    {
      "url": "https://myapp.com/about",
      "name": "about",
      "output": "public/images/about.png",
      "browser": {
        "width": 375,
        "fullPage": false
      }
    }
  ]
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `storage.adapter` | Yes | `"filesystem"` or `"cloudinary"` |
| `storage.options.folder` | For cloudinary | Cloudinary folder prefix |
| `browser.width` | No | Viewport width (default: 1280) |
| `browser.height` | No | Viewport height (default: 800) |
| `browser.fullPage` | No | Capture full scrollable page (default: true) |
| `browser.waitUntil` | No | Puppeteer wait condition (default: "networkidle2") |
| `browser.delayMs` | No | Extra wait after page load (default: 0) |
| `browser.userAgent` | No | Custom user agent string (default: Chrome on Windows) |
| `browser.extraHeaders` | No | Additional HTTP headers as key-value pairs |
| `shots[].url` | Yes | Full URL to screenshot |
| `shots[].name` | Yes | Slug identifier (lowercase, hyphens only) |
| `shots[].output` | Yes | Output path reference |
| `shots[].browser` | No | Per-shot browser overrides |

## Handling Cloudflare and Bot Protection

If your site uses Cloudflare or similar bot protection, you may encounter challenge pages. Here's how to handle them:

### Option 1: Increase Delay

Add a delay to let the page fully load after any challenges:

```json
{
  "browser": {
    "delayMs": 5000
  }
}
```

### Option 2: Custom Headers

Some protections check for specific headers:

```json
{
  "browser": {
    "extraHeaders": {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml"
    }
  }
}
```

### Option 3: Whitelist CI IP

The most reliable approach: whitelist your CI/CD IP addresses in Cloudflare's firewall rules. This bypasses challenges entirely for automated requests.

### Option 4: Use a Different Wait Condition

Try `networkidle0` instead of `networkidle2`:

```json
{
  "browser": {
    "waitUntil": "networkidle0",
    "delayMs": 3000
  }
}
```

## Adapters

### Filesystem Adapter

Saves screenshots to local disk. No environment variables required.

```json
{
  "storage": {
    "adapter": "filesystem"
  }
}
```

### Cloudinary Adapter

Uploads to Cloudinary. Requires environment variables:

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

```json
{
  "storage": {
    "adapter": "cloudinary",
    "options": {
      "folder": "myapp/screenshots"
    }
  }
}
```

## Deterministic URLs

When using Cloudinary, the URL is fully predictable before upload:

```
https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{name}.png
```

This means you can hardcode the URL in your HTML before the first screenshot is even taken. Each run overwrites the image in place.

**Important:** Cloudinary adds version numbers to URLs internally (e.g., `v1777284122`), but you should always use the versionless URL shown above. When you request the versionless URL, Cloudinary automatically serves the latest version. This keeps your URLs deterministic and unchanging.

## CI/CD Integration

**The sequence:** Build → Deploy → Run websiteprev → Commit manifest → Push

This tool screenshots your LIVE production site, so it must run after deployment.

### GitHub Actions

```yaml
name: Deploy and Screenshot

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # 1. Build your project
      - name: Build
        run: npm run build
      
      # 2. Deploy to production
      - name: Deploy
        run: # your deploy command here
      
      # 3. Take screenshots of the LIVE site
      - name: Capture screenshots
        run: npx websiteprev run
        env:
          CLOUDINARY_CLOUD_NAME: ${{ secrets.CLOUDINARY_CLOUD_NAME }}
          CLOUDINARY_API_KEY: ${{ secrets.CLOUDINARY_API_KEY }}
          CLOUDINARY_API_SECRET: ${{ secrets.CLOUDINARY_API_SECRET }}
      
      # 4. Commit the updated manifest back to the repo
      - name: Commit manifest
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add websiteprev.manifest.json
          git diff --quiet && git diff --staged --quiet || git commit -m "Update screenshot manifest [skip ci]"
          git push
```

**Setting up GitHub Secrets:**

1. Go to your repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add these three secrets:
   - `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY` - Your Cloudinary API key
   - `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### GitLab CI

```yaml
deploy:
  stage: deploy
  script:
    - # your deploy command

screenshots:
  stage: post-deploy
  script:
    - npx websiteprev run
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
    - git add websiteprev.manifest.json
    - git diff --quiet && git diff --staged --quiet || git commit -m "Update screenshot manifest [skip ci]"
    - git push https://oauth2:${CI_PUSH_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
  variables:
    CLOUDINARY_CLOUD_NAME: $CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY: $CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET: $CLOUDINARY_API_SECRET
```

**Setting up GitLab Variables:**

1. Go to Settings > CI/CD > Variables
2. Add these three variables (mark as "Masked"):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Add `CI_PUSH_TOKEN` with a personal access token that has `write_repository` scope

### Any Shell

```bash
CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=yyy CLOUDINARY_API_SECRET=zzz npx websiteprev run
```

## Manifest File

After each run, `websiteprev.manifest.json` is written to your project root. Commit this file back to your repo.

```json
{
  "generated": "2026-04-27T10:00:00.000Z",
  "adapter": "cloudinary",
  "shots": [
    {
      "name": "home",
      "url": "https://myapp.com",
      "output": "public/images/home.png",
      "remoteUrl": "https://res.cloudinary.com/mycloud/image/upload/myapp/screenshots/home.png",
      "status": "success"
    }
  ]
}
```

Your app can import this to get URLs dynamically:

```js
import manifest from './websiteprev.manifest.json' assert { type: 'json' };
const ogImage = manifest.shots.find(s => s.name === 'home').remoteUrl;
```

## Node.js API

```js
import { websiteprev } from 'websiteprev';

await websiteprev({
  config: './websiteprev.config.json',
  env: process.env
});
```

## License

MIT

## Links

- [npm package](https://www.npmjs.com/package/websiteprev)
- [GitHub repository](https://github.com/isaac0yen/WEBSITEPREV)
- [Report issues](https://github.com/isaac0yen/WEBSITEPREV/issues)

## Troubleshooting

### "URL mismatch" error with Cloudinary

This has been fixed in the latest version. Cloudinary adds version numbers to URLs internally, but the tool now returns versionless URLs which are deterministic and always work.

### Cloudflare challenge detected

Your site is blocking automated browsers. Solutions:
1. Whitelist your CI IP in Cloudflare (most reliable)
2. Increase `delayMs` to 5000+ milliseconds
3. Add custom headers (see examples/cloudflare-protected.config.json)
4. Use `waitUntil: "networkidle0"` instead of `networkidle2`

### Screenshots are blank or incomplete

The page may not be fully loaded. Try:
1. Increase `delayMs` (e.g., 3000 for 3 seconds)
2. Change `waitUntil` to `"networkidle0"` (stricter)
3. Set `fullPage: false` if the page has infinite scroll

### Navigation timeout

The page took too long to load. The default timeout is 60 seconds. Check:
1. Is the URL correct and accessible?
2. Is the site actually deployed?
3. Does the site have slow-loading resources?

### Missing environment variables (Cloudinary)

Make sure these are set in your CI environment:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Check your CI provider's documentation for setting secrets.
