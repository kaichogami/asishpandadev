# GitHub Pages Deployment Guide

This guide covers deploying your static website to GitHub Pages with custom domain support and automated deployment scripts.

## Overview

GitHub Pages allows you to host static websites directly from your GitHub repository. This setup includes:
- Automated builds and deployments
- Custom domain configuration
- HTTPS support
- One-command deployment script

## Prerequisites

- GitHub account
- Git installed locally
- Node.js 16.0.0 or higher
- Custom domain (optional)

## Initial Setup

### 1. Create GitHub Repository

```bash
# Initialize git if not already done
git init

# Add remote repository (replace with your repository)
git remote add origin https://github.com/yourusername/your-website.git

# Add all files and make initial commit
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Configure GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. This allows custom workflows for building and deploying

### 3. Set Up GitHub Actions Workflow

Create the workflow directory and file:

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./output

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Custom Domain Configuration

### 1. DNS Configuration

Set up your DNS records with your domain provider:

**For a root domain (example.com):**
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**For a subdomain (www.example.com):**
```
Type: CNAME
Name: www
Value: yourusername.github.io
```

### 2. Add CNAME File

Create a `CNAME` file in your project root:

```bash
echo "yourdomain.com" > CNAME
```

Or for a subdomain:
```bash
echo "www.yourdomain.com" > CNAME
```

### 3. Update Site Configuration

In `config.yml`, update the base URL:

```yaml
site:
  base_url: "https://yourdomain.com"  # or https://www.yourdomain.com
```

### 4. Configure in GitHub

1. Go to repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Check **Enforce HTTPS** (recommended)
4. GitHub will verify your domain configuration

## Deployment Scripts

### Manual Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

# GitHub Pages Manual Deployment Script
set -e

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the site
echo "🔨 Building site..."
npm run build

# Check if build was successful
if [ ! -d "output" ]; then
    echo "❌ Build failed: output directory not found"
    exit 1
fi

# Commit and push
echo "📤 Committing and pushing changes..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

echo "✅ Deployment initiated!"
echo "🌐 Your site will be available at your GitHub Pages URL in a few minutes"
echo "📊 Check deployment status: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
```

### Quick Deploy Script

Create `scripts/quick-deploy.sh`:

```bash
#!/bin/bash

# Quick deployment script - builds and pushes in one command
set -e

echo "⚡ Quick deploy starting..."

# Build
npm run build

# Deploy
git add . && git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" && git push

echo "✅ Quick deploy complete!"
```

### Make Scripts Executable

```bash
chmod +x scripts/deploy.sh
chmod +x scripts/quick-deploy.sh
```

## NPM Scripts for Deployment

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "node build.js --build",
    "serve": "node build.js --serve",
    "dev": "node build.js --watch --serve",
    "deploy": "./scripts/deploy.sh",
    "quick-deploy": "./scripts/quick-deploy.sh",
    "deploy:check": "npm run build && echo 'Build successful - ready for deployment'"
  }
}
```

## Usage Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy:check # Test build before deployment
```

### Deployment
```bash
npm run deploy       # Full deployment with checks
npm run quick-deploy # Quick deployment
```

### Manual Commands
```bash
./scripts/deploy.sh     # Manual deployment script
./scripts/quick-deploy.sh # Quick deployment script
```

## Environment Setup

### Local Development with Production URLs

For testing with production URLs locally, create `.env.local`:

```bash
NODE_ENV=production
BASE_URL=https://yourdomain.com
```

### GitHub Actions Secrets

If you need environment variables in GitHub Actions:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add repository secrets as needed
3. Reference in workflow: `${{ secrets.SECRET_NAME }}`

## Monitoring and Troubleshooting

### Check Deployment Status

1. **GitHub Actions**: Repository → **Actions** tab
2. **Pages Status**: Repository → **Settings** → **Pages**
3. **Build Logs**: Click on any workflow run for detailed logs

### Common Issues and Solutions

#### Build Failures
```bash
# Check build locally
npm run build

# Check for Node.js version compatibility
node --version  # Should be 16.0.0 or higher
```

#### DNS Issues
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com
```

#### Custom Domain Not Working
1. Verify CNAME file exists and contains correct domain
2. Check DNS records with your domain provider
3. Ensure domain verification is complete in GitHub
4. Wait for DNS propagation (can take up to 24 hours)

#### 404 Errors
1. Check that `index.html` exists in output directory
2. Verify GitHub Pages source is set to GitHub Actions
3. Ensure all relative links start with `{{ config.site.base_url }}`

### Debug Build Issues

```bash
# Verbose build for debugging
DEBUG=* npm run build

# Check output directory
ls -la output/

# Test static serving locally
npm run serve
```

## Best Practices

### Pre-deployment Checklist

1. ✅ Test build locally: `npm run build`
2. ✅ Test site locally: `npm run serve`
3. ✅ Check all links work
4. ✅ Verify custom domain configuration
5. ✅ Run deployment script: `npm run deploy`

### Automated Deployment

- **Push to main** triggers automatic deployment
- **Pull requests** trigger build tests without deployment
- **Manual trigger** available in GitHub Actions tab

### Rollback Strategy

```bash
# Rollback to previous commit
git log --oneline -5          # Find commit to rollback to
git reset --hard COMMIT_HASH  # Reset to that commit
git push --force-with-lease   # Force push (be careful!)
```

### Performance Optimization

1. **Optimize images** before committing
2. **Minify CSS** in production builds
3. **Enable compression** in GitHub Pages settings
4. **Use CDN** for large assets if needed

## Security Considerations

- ✅ Enable HTTPS enforcement
- ✅ Use dependabot for dependency updates
- ✅ Regularly update Node.js version in workflows
- ✅ Don't commit sensitive data
- ✅ Use secrets for any API keys

## Support and Resources

- **GitHub Pages Documentation**: https://docs.github.com/pages
- **GitHub Actions**: https://docs.github.com/actions
- **Custom Domains**: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site
- **DNS Help**: Contact your domain provider's support

---

**Quick Start Summary:**
1. `npm run build` - Test build
2. Create GitHub repo and push code
3. Enable GitHub Pages with Actions
4. Add custom domain (optional)
5. `npm run deploy` - Deploy!