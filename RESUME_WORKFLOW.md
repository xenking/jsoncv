# Resume Versioning Workflow

## Overview

This document explains how resume versioning works in the jsoncv project with local storage and static deployment to Cloudflare Workers.

## Key Concepts

### 1. Resume Name Convention

- **Source of Truth:** `meta.name` field in your resume JSON file
- **Example:** `"meta": { "name": "Example CV" }`
- **Environment Variable:** `RESUME_NAME` in `wrangler.toml` must match this name
- **Repository Storage:** All resumes stored in `resumes/` folder

### 2. sample.cv.json Usage

- **Editor Example:** Used as default example in the resume editor
- **Development:** Used for testing builds locally

### 3. Local Versioning Strategy

When you update a resume:

1. **Run version command:** `pnpm run version-resume path/to/new-resume.json`
2. **Script reads `meta.name`** from your JSON file (e.g., "Example CV")
3. **Backup old version:** If `resumes/Example CV.json` exists, renames to `resumes/Example CV.2024-12-22T07-00-00.json`
4. **Copy new version:** Copies new file to `resumes/Example CV.json`
5. **History preserved:** All timestamped versions remain in the repository

**Benefits:**

- Latest resume always at the same filename
- Complete history tracked in Git
- No external dependencies (R2, etc.)
- Easy to rollback via Git

## Workflow

### Manual Versioning

To update your resume with versioning:

```bash
# 1. Edit your resume JSON file (e.g., sample.cv.json)
# 2. Run the version command
pnpm run version-resume sample.cv.json

# Or version any other resume file
pnpm run version-resume path/to/my-updated-resume.json
```

The script will:

- Read `meta.name` from the JSON
- Backup existing version with timestamp
- Copy new version as the latest

### Build All Resumes

To build HTML versions of all resumes:

```bash
pnpm run build-resumes
```

This will:

- Build HTML for each `.json` file in `resumes/` folder
- Output to `dist/resume/` directory
- Create both JSON and HTML versions

### Build Everything

```bash
pnpm run build-all
```

Builds both the editor site and all resume versions.

### Automatic (GitHub Actions)

On push to `master` branch:

1. Builds editor site
2. Builds all resume versions (JSON + HTML)
3. Copies latest resume HTML to `dist/index.html` (for root path)
4. Deploys static assets to Cloudflare Workers

## Access Patterns

### Latest Resume (HTML)

```text
https://cv.xenking.pro/
```

Serves the latest HTML version of the resume specified by `RESUME_NAME` in `wrangler.toml`.

### Latest Resume (JSON)

```text
https://cv.xenking.pro/resume/Example CV.json
```

### Specific Version (HTML)

```text
https://cv.xenking.pro/resume/Example CV.2024-12-22T07-00-00.html
```

### Specific Version (JSON)

```text
https://cv.xenking.pro/resume/Example CV.2024-12-22T07-00-00.json
```

### Editor

```text
https://cv.xenking.pro/editor
```

## Configuration

Ensure `RESUME_NAME` in `wrangler.toml` matches the `meta.name` in your resume JSON:

| Location | Value |
|----------|-------|
| `resumes/Example CV.json` | `"meta": { "name": "Example CV" }` |
| `wrangler.toml` | `RESUME_NAME = "Example CV"` |

This determines which resume is served at the root URL (`https://cv.xenking.pro/`).

## Rollback Process

To rollback to a previous version:

```bash
# Option 1: Use Git
git checkout HEAD~1 resumes/Example\ CV.json

# Option 2: Copy from versioned file
cp "resumes/Example CV.2024-12-22T07-00-00.json" "resumes/Example CV.json"

# Then rebuild
pnpm run build-all

# Commit and push
git add resumes/
git commit -m "Rollback resume to previous version"
git push
```

## Directory Structure

```text
jsoncv/
├── resumes/
│   ├── Example CV.json                      # Latest version
│   ├── Example CV.2024-12-22T07-00-00.json  # Timestamped version
│   └── Example CV.2024-12-21T15-30-00.json  # Older version
├── dist/                                     # Built output
│   ├── index.html                            # Latest resume HTML (root)
│   ├── resume/
│   │   ├── Example CV.json                   # Latest JSON
│   │   ├── Example CV.html                   # Latest HTML
│   │   ├── Example CV.2024-12-22T07-00-00.json
│   │   ├── Example CV.2024-12-22T07-00-00.html
│   └── editor/                               # Editor app
└── sample.cv.json                            # Example for editor
```
