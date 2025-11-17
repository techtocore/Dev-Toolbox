# GitHub Pages Deployment Setup

## Configuration Complete ✅

Your Angular application is now configured to automatically build and deploy to GitHub Pages.

## What Was Set Up

1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
   - Automatically builds on every push to `main` branch
   - Can also be triggered manually via workflow_dispatch
   - Deploys to GitHub Pages

2. **Build Configuration**
   - Base href set to `/Dev-Toolbox/` (matching your repository name)
   - `.nojekyll` file included to ensure proper asset loading

## Required GitHub Settings

To complete the setup, you need to configure GitHub Pages in your repository:

1. Go to your GitHub repository: `https://github.com/techtocore/Dev-Toolbox`
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
4. Save the settings

## Deployment

Once configured, your app will automatically deploy when you:
- Push changes to the `main` branch
- Manually trigger the workflow from the Actions tab

Your site will be available at: `https://techtocore.github.io/Dev-Toolbox/`

## Manual Deployment

You can also manually trigger deployment:
1. Go to the **Actions** tab in your repository
2. Select the "Build and Deploy to GitHub Pages" workflow
3. Click "Run workflow"

## Troubleshooting

- **404 errors**: Ensure GitHub Pages is set to use "GitHub Actions" as the source
- **Assets not loading**: The `.nojekyll` file should be included in your build
- **Base href issues**: The workflow uses `--base-href /Dev-Toolbox/` - adjust if your repo name changes
