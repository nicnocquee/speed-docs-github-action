# Speed Docs GitHub Action

A GitHub Action that builds documentation using the [speed-docs](https://github.com/nicnocquee/speed-docs) CLI and deploys it to GitHub Pages.

[![Release](https://img.shields.io/github/v/release/nicnocquee/speed-docs)](https://github.com/nicnocquee/speed-docs/releases)

## Features

- 🚀 Builds documentation using speed-docs CLI
- 📦 Deploys to GitHub Pages automatically

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
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        id: setup_pages
        uses: actions/configure-pages@v5 # You need to add this step if you are NOT using custom domain

      - name: Deploy docs to GitHub Pages
        uses: nicnocquee/speed-docs-github-action@v1
        with:
          content-path: "./docs"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-path: ${{ steps.setup_pages.outputs.base_path }} # You need to add this step if you are NOT using custom domain
```

If you use a custom domain, you need to create a CNAME file in the root of the content directory with your custom domain name. For example:

```
speed-docs.dev
```

Then use the following workflow:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Deploy docs to GitHub Pages
        uses: nicnocquee/speed-docs-github-action@v1
        with:
          content-path: "./docs"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

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

| Input            | Description                                                           | Required | Default       |
| ---------------- | --------------------------------------------------------------------- | -------- | ------------- |
| `content-path`   | Path to the directory containing your content (config.json and docs/) | ✅       | -             |
| `github-token`   | GitHub token for authentication (use `${{ secrets.GITHUB_TOKEN }}`)   | ✅       | -             |
| `output-dir`     | Output directory name                                                 | ❌       | `docs-output` |
| `template-url`   | Override the default template repository URL                          | ❌       | -             |
| `force`          | Force redownload and reinstall template (ignores cache)               | ❌       | `false`       |
| `download-dir`   | Override the default download/cache directory                         | ❌       | -             |
| `base-path`      | Base path for the documentation site                                  | ❌       | -             |
| `include-hidden` | Include hidden files and directories in the content directory         | ❌       | `false`       |

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

Read more in the [speed-docs documentation](https://speed-docs.dev/quick-start/preparing-your-content).

## Example

The documentation website for speed-docs is built with this action and deployed to GitHub Pages. You can see the workflow [here](https://github.com/nicnocquee/speed-docs/blob/main/.github/workflows/pages.yml) and the content [here](https://github.com/nicnocquee/speed-docs/tree/main/docs).

Another example is the documentation website for [simple-i18n-next](https://nicnocquee.github.io/simple-i18n-next/). The content is [here](https://github.com/nicnocquee/simple-i18n-next/tree/main/docs) and the workflow is [here](https://github.com/nicnocquee/simple-i18n-next/blob/main/.github/workflows/publish-page.yml).

## GitHub Pages Setup

1. Go to your repository settings
2. Navigate to "Pages" section
3. Set source to "Deploy from a branch"
4. Select "gh-pages" branch. If none, use the "main" branch first.
5. Set folder to "/ (root)".
6. After the first deployment, switch the source to "Deploy from a branch" and select "gh-pages" branch. Then redeploy.

The action will automatically create and push to the `gh-pages` branch.

### Development

To work on this action locally:

```bash
# Install dependencies
npm install

# Build the action
npm run build

# Test locally
node dist/index.js
```

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

### Pages not found

If you got the following error in GitHub actions logs:

```
Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions, or consider exploring the `enablement` parameter for this action. Error: Not Found
```

Make sure you have configured the Pages settings in your repository. If you don't have `gh-pages` branch yet, you can create it first or in some cases toggling the "Source" in "Pages" section of your repository settings from "GitHub Actions" to "Deploy from a branch" fixes the issue. It's ok to have the `main` branch as the source at the beginning. You just need to switch it to `gh-pages` branch after the first deployment.

## License

MIT

## Author

[Nico Prananta](https://nico.fyi)
