# Configuration Guide

This document explains how to configure jsoncv for your own domain and deployment.

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

### Available Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DOMAIN` | Your deployment domain | Yes | `your-domain.com` |
| `TWITTER_USERNAME` | Twitter username for metadata | No | `xenking` |

### Example `.env` file

```env
DOMAIN=cv.example.com
TWITTER_USERNAME=yourhandle
```

## Wrangler Configuration

Update `wrangler.toml` with your Cloudflare settings:

```toml
# Route to custom domain - UPDATE THESE VALUES
[[routes]]
pattern = "cv.example.com/*"  # Your domain
zone_name = "example.com"      # Your Cloudflare zone

# Environment variables
[vars]
DOMAIN = "cv.example.com"      # Your domain
RESUME_NAME = "Your Name"      # Must match meta.name in resume JSON
```

### Key Configuration Points

1. **`pattern`** - Should match your full subdomain with wildcard
2. **`zone_name`** - The root domain managed by Cloudflare
3. **`vars.DOMAIN`** - Used for generating URLs in build output
4. **`vars.RESUME_NAME`** - Must exactly match the `meta.name` field in your resume JSON

## GitHub Actions

If you fork this repository, update the environment variables in `.github/workflows/deploy.yml`:

```yaml
- name: Build site and all resumes
  env:
    DOMAIN: cv.example.com       # Change to your domain
    TWITTER_USERNAME: yourhandle  # Change to your handle
  run: pnpm run build-all
```

You'll also need to add these GitHub secrets:

- `CLOUDFLARE_API_TOKEN` - API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Local Development

For local development, the `.env` file will be automatically loaded by the build scripts:

```bash
# Create .env from example
cp .env.example .env

# Edit with your values
nano .env

# Run local development
pnpm run dev-site

# Build with your domain
pnpm run build-all
```

The `DOMAIN` environment variable is used in:

- **Build scripts** (`scripts/build-resumes.js`, `scripts/version-resume.js`) - For console output URLs
- **Vite config** (`vite.config.site.js`) - For meta tags and social metadata
- **GitHub Actions** - For consistent build output

## Resume Configuration

Your resume JSON must have a `meta.name` field that matches `RESUME_NAME` in `wrangler.toml`:

```json
{
  "meta": {
    "name": "Your Name"
  },
  "basics": {
    "name": "Your Full Name",
    ...
  }
}
```

This ensures:

1. The correct resume is served at the root URL (`https://your-domain.com/`)
2. Versioning works correctly
3. Build scripts can identify the latest resume

## Quick Setup Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Update `DOMAIN` in `.env`
- [ ] Update `wrangler.toml` with your domain and zone
- [ ] Update `RESUME_NAME` in `wrangler.toml`
- [ ] Ensure `meta.name` in your resume JSON matches `RESUME_NAME`
- [ ] Update GitHub Actions environment variables (if using CI/CD)
- [ ] Add GitHub secrets for Cloudflare API
- [ ] Update resume content in `resumes/` folder

## Troubleshooting

### Domain not resolving

- Verify `pattern` and `zone_name` in `wrangler.toml` match your Cloudflare setup
- Ensure DNS is pointed to Cloudflare
- Check that your domain is added to your Cloudflare account

### Build showing wrong URLs

- Check `DOMAIN` environment variable is set in `.env` or CI/CD
- Verify the variable is exported before running build commands

### Resume not serving at root

- Ensure `RESUME_NAME` in `wrangler.toml` matches `meta.name` in your resume JSON
- Verify the resume file exists in `resumes/` folder
- Check that `dist/index.html` was created during build
