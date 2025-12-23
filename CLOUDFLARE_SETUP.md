# Cloudflare Workers Deployment Setup

This project uses Cloudflare Workers with static assets to serve resumes and the editor.

## Architecture

**Static Assets Deployment** at `cv.xenking.pro`:

- **`/`** - Latest resume HTML (automatically updated)
- **`/editor`** - Resume editor application
- **`/resume/*.json`** - Resume JSON files (all versions)
- **`/resume/*.html`** - Resume HTML files (all versions)

All resumes are stored in the `resumes/` folder in the repository and built to static assets during CI/CD.

## Prerequisites

### 1. Configure Your Domain

Copy the example environment file and update it with your domain:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DOMAIN=cv.yourdomain.com
TWITTER_USERNAME=yourhandle
```

Update `wrangler.toml` with your Cloudflare domain settings (see comments in file for guidance).

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed configuration instructions.

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` - API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID

To create an API token:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Create Token → Custom Token
3. Grant permissions:
   - Account → Cloudflare Workers Scripts → Edit
   - Account → Account Settings → Read
   - Zone → Workers Routes → Edit

### 3. Update GitHub Workflow

Edit `.github/workflows/deploy.yml` and update the environment variables in the build step with your domain.

### 4. Verify Domain Setup

Ensure:

- Your domain is added to your Cloudflare account
- DNS is managed by Cloudflare for this domain

## Local Development

Install dependencies:

```bash
pnpm install
```

### Work on Editor

```bash
pnpm run dev-site
```

Opens editor at `http://localhost:5173`

### Build Everything

```bash
pnpm run build-all
```

Builds editor site and all resume versions.

### Test Locally with Wrangler

```bash
pnpm run build-all
npx wrangler dev
```

Opens local worker at `http://localhost:8787`

## Resume Management

### Adding/Updating a Resume

**Step 1: Create or edit your resume JSON** with `meta.name` field:

```json
{
  "meta": {
    "name": "Example CV"
  },
  "basics": { ... }
}
```

**Step 2: Version the resume** (backs up old version):

```bash
pnpm run version-resume path/to/your-resume.json
```

This copies your resume to `resumes/Example CV.json` and backs up any existing version.

**Step 3: Commit to repository**:

```bash
git add resumes/
git commit -m "Update resume"
git push
```

GitHub Actions will automatically build and deploy.

### Resume Naming

The `RESUME_NAME` in `wrangler.toml` determines which resume appears at the root URL:

```toml
[vars]
RESUME_NAME = "Example CV"  # Must match meta.name in resume JSON
```

### Access URLs

Replace `your-domain.com` with your actual domain from `.env`:

- **Latest HTML:** `https://your-domain.com/`
- **Latest JSON:** `https://your-domain.com/resume/Example CV.json`
- **Specific version HTML:** `https://your-domain.com/resume/Example CV.2024-12-22T07-00-00.html`
- **Specific version JSON:** `https://your-domain.com/resume/Example CV.2024-12-22T07-00-00.json`

## Deployment

### Manual Deployment

```bash
# Build everything
pnpm run build-all

# Deploy to Cloudflare Workers
npx wrangler deploy
```

### Automatic Deployment

Push to `master` branch triggers automatic build and deployment via GitHub Actions.

## Configuration Files

- **`wrangler.toml`** - Wrangler configuration for static assets deployment
- **`resumes/`** - Directory containing all resume versions
- **`.github/workflows/deploy.yml`** - GitHub Actions workflow
- **`scripts/version-resume.js`** - Script to version resumes
- **`scripts/build-resumes.js`** - Script to build all resume HTML/JSON files

## Troubleshooting

### Resume not showing at root URL

- Verify `RESUME_NAME` in `wrangler.toml` matches `meta.name` in your resume JSON
- Check that `resumes/Example CV.json` exists
- Run `pnpm run build-all` to rebuild
- Verify `dist/index.html` was created

### Versioned resume not accessible

- Ensure the versioned file exists in `resumes/` folder
- Run `pnpm run build-resumes` to rebuild resume outputs
- Check `dist/resume/` for built files

### Editor not loading

- Verify `pnpm run build-site` completes successfully
- Check that `dist/` directory contains built files
- Review `assets.directory` path in `wrangler.toml`

## Project Structure

```text
jsoncv/
├── resumes/              # All resume versions (JSON)
├── dist/                 # Built static assets
│   ├── index.html       # Latest resume (root)
│   ├── resume/          # All resume JSON + HTML files
│   └── editor/          # Editor application
├── scripts/
│   ├── version-resume.js    # Resume versioning script
│   └── build-resumes.js     # Build all resumes script
├── wrangler.toml        # Cloudflare Workers config
└── sample.cv.json       # Example resume for editor
```
