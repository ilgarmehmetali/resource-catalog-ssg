# Resource Catalog Static Site Generator

A static site generator and single-page web viewer for files organized in nested folders.

> [!WARNING]
> **Vibe Coded**: This project is vibe coded and provided strictly as-is with no guarantee that it works. Use at your own risk.

## Quick Start

Requires Python 3.10+ (no dependencies needed).

```bash
# Build and serve locally at http://localhost:8000
python3 build.py --serve

# Build only (outputs to dist/)
python3 build.py
```

## Structure & Usage

- **`resources/`**: Place files and subfolders here.
  - Detailed metadata guide: [English](docs/RESOURCES_GUIDE.md) | [Türkçe](docs/RESOURCES_GUIDE_TR.md)
- **`about.md`**: Landing page introduction and profile links.
- **`templates/`**: Frontend assets (`index.html`, `styles.css`, `app.js`).

## Deployment

A GitHub Actions workflow is provided in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push the repository to GitHub.
2. In **Settings** → **Pages**, set **Source** to **GitHub Actions**.

## Tests

```bash
python3 -m unittest discover tests
node --test tests/test_app.js
```
