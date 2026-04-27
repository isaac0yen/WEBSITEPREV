# websiteprev

An npm CLI package that captures website screenshots after deployment. Language-agnostic — works with any project (PHP, Rust, TypeScript, etc.).

## Installation

```bash
npm install websiteprev
```

## Quick Start

```bash
# Initialize a config file
npx websiteprev init

# Edit websiteprev.config.json with your URLs

# Run after deployment
npx websiteprev run
```

## CLI Commands

### `websiteprev run`

Runs the full screenshot pipeline.

```bash
npx websiteprev run
npx websiteprev run --config ./path/to/config.json
npx websiteprev run --dry-run
```

Options:
- `--config <path>`: Path to config file (default: `./websiteprev.config.json`)
- `--dry-run`: Validate config and print what would run without taking screenshots

### `websiteprev init`

Creates a template `websiteprev.config.json` in the current directory.

### `websiteprev validate`

Validates the config file without running any screenshots.

### `websiteprev url <name>`

Prints the deterministic URL for a named shot. Use this to get the URL to hardcode in your HTML before your first run.

```bash
npx websiteprev url home
# Output: home → https://res.cloudinary.com/mycloud/image/upload/myapp/screenshots/home.png
```

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
| `shots[].url` | Yes | Full URL to screenshot |
| `shots[].name` | Yes | Slug identifier (lowercase, hyphens only) |
| `shots[].output` | Yes | Output path reference |
| `shots[].browser` | No | Per-shot browser overrides |

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

## CI/CD Integration

**Important:** Always deploy BEFORE running `websiteprev`.

### GitHub Actions

```yaml
- name: Deploy
  run: # your deploy command

- name: Take screenshots
  run: npx websiteprev run
  env:
    CLOUDINARY_CLOUD_NAME: ${{ secrets.CLOUDINARY_CLOUD_NAME }}
    CLOUDINARY_API_KEY: ${{ secrets.CLOUDINARY_API_KEY }}
    CLOUDINARY_API_SECRET: ${{ secrets.CLOUDINARY_API_SECRET }}
```

### GitLab CI

```yaml
screenshots:
  stage: post-deploy
  script:
    - npx websiteprev run
```

### Any Shell

```bash
CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=yyy CLOUDINARY_API_SECRET=zzz npx websiteprev run
```

## Manifest File

After each run, `websiteprev.manifest.json` is written to your project root:

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

Import this in your build process:

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
