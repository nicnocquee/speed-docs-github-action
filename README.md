# Speed Docs GitHub Action

A GitHub Action that builds documentation using the [speed-docs](https://github.com/nicnocquee/speed-docs) CLI and deploys it to GitHub Pages.

[![Build Status](https://github.com/nicnocquee/speed-docs/workflows/Build%20and%20Publish%20Action/badge.svg)](https://github.com/nicnocquee/speed-docs/actions)
[![Release](https://img.shields.io/github/v/release/nicnocquee/speed-docs)](https://github.com/nicnocquee/speed-docs/releases)

## Features

- 🚀 Builds documentation using speed-docs CLI
- 📦 Deploys to GitHub Pages automatically
- 🔧 Configurable template and build options
- ✅ Validates content structure before building

## Usage

### Published Action (Recommended)

Use the published action from the dedicated repository:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        id: setup_pages
        uses: actions/configure-pages@v5

      - name: Deploy docs to GitHub Pages
        uses: nicnocquee/speed-docs-github-action@v1
        with:
          content-path: "./docs"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-path: ${{ steps.setup_pages.outputs.base_path }}
```

> **Note**: The action is automatically published to a separate repository when releases are created in this monorepo.

### Local Development

For local development or testing within this repository:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write # Required for pushing to gh-pages branch
    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        id: setup_pages
        uses: actions/configure-pages@v5

      - name: Deploy docs to GitHub Pages
        uses: ./apps/speed-docs-github-action
        with:
          content-path: "./docs"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-path: ${{ steps.setup_pages.outputs.base_path }}
```

### Advanced Usage

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write # Required for pushing to gh-pages branch
    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        id: setup_pages
        uses: actions/configure-pages@v5

      - name: Deploy docs to GitHub Pages
        uses: nicnocquee/speed-docs-github-action@v1
        with:
          content-path: "./docs"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-path: ${{ steps.setup_pages.outputs.base_path }}
          output-dir: "build-output"
          template-url: "https://github.com/custom/template.git"
          force: true
          download-dir: "/tmp/speed-docs-cache"
```

## Inputs

| Input          | Description                                                           | Required | Default       |
| -------------- | --------------------------------------------------------------------- | -------- | ------------- |
| `content-path` | Path to the directory containing your content (config.json and docs/) | ✅       | -             |
| `github-token` | GitHub token for authentication (use `${{ secrets.GITHUB_TOKEN }}`)   | ✅       | -             |
| `output-dir`   | Output directory name                                                 | ❌       | `docs-output` |
| `template-url` | Override the default template repository URL                          | ❌       | -             |
| `force`        | Force redownload and reinstall template (ignores cache)               | ❌       | `false`       |
| `download-dir` | Override the default download/cache directory                         | ❌       | -             |
| `base-path`    | Base path for the documentation site                                  | ❌       | -             |

## Outputs

| Output        | Description                         |
| ------------- | ----------------------------------- |
| `output-path` | Path to the generated documentation |

## Content Structure

Your content directory should have the following structure:

```
docs/
├── config.json
├── logo.png
└── docs/
    ├── index.mdx
    └── other-pages/
        └── page.mdx
```

The `config.json` file should contain your documentation configuration:

```json
{
  "nav": {
    "title": "My Documentation",
    "image": "/logo.png"
  }
}
```

## GitHub Pages Setup

1. Go to your repository settings
2. Navigate to "Pages" section
3. Set source to "Deploy from a branch"
4. Select "gh-pages" branch
5. Set folder to "/ (root)"

The action will automatically create and push to the `gh-pages` branch.

## Requirements

- Node.js 18 or higher
- Valid content structure with `config.json` and `docs/` directory
- GitHub token with appropriate permissions

## Publishing

This GitHub Action is automatically built and published when releases are created. **Version management is fully automated** - you only need to create a GitHub release, and the version will be automatically synchronized.

### How to Publish a New Version (Automated)

1. **Create a release** on GitHub:

   - Go to the [Releases page](https://github.com/nicnocquee/speed-docs/releases)
   - Click "Create a new release"
   - Create a new tag (e.g., `v1.1.0`)
   - Add release notes
   - Publish the release

2. **Everything else is automatic**:
   - ✅ Version is automatically updated in `package.json`
   - ✅ Action is built and published
   - ✅ Available as `nicnocquee/speed-docs-github-action@v1.1.0`

### Automated Workflows

The publishing process uses two automated workflows:

1. **Pre-Release Validation**: Validates the release tag and checks readiness
2. **Release Action**: Updates version, builds and publishes the action

### Manual Version Management (Optional)

If you prefer to manage versions manually:

```bash
# Update package.json version
cd apps/speed-docs-github-action
npm version patch  # or minor, major

# Commit and push
git add package.json
git commit -m "chore: bump version to X.X.X"
git push
```

### Development

To work on this action locally:

```bash
# Install dependencies
cd apps/speed-docs-github-action
npm install

# Build the action
npm run build

# Test locally
node dist/index.js
```

### Workflows

- **Build Workflow**: Automatically builds the action on every push/PR
- **Release Workflow**: Automatically publishes the action when a release is created

## Troubleshooting

### Permission Denied Error

If you encounter a "Permission denied to github-actions[bot]" error, this means the `GITHUB_TOKEN` doesn't have write permissions. Add the following to your workflow:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write # Required for pushing to gh-pages branch
    steps:
      # ... your steps
```

### Alternative: Repository-Level Permissions

You can also set permissions globally for all workflows in your repository:

1. Go to your repository **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select **"Read and write permissions"**
3. Click **Save**

### Authentication Issues

If you see authentication errors like "could not read Password", ensure you're using the correct token format. The action automatically handles authentication using the `x-access-token` format.

## License

MIT
