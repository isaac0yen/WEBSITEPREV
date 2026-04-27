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
