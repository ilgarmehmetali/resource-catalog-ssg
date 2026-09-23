# Resources & Metadata Guide

This guide explains how to organize files in the `resources/` directory and attach metadata using clean **YAML**.

[Türkçe Versiyon](RESOURCES_GUIDE_TR.md)

---

## 1. Directory Structure

You can nest folders as deeply as you like inside `resources/`. The catalog generator automatically mirrors this folder hierarchy in the web viewer.

```text
resources/
├── README.md                          <-- (Optional) Overview of the whole catalog
├── documents/
│   ├── README.md                      <-- (Optional) Overview of this specific folder
│   ├── _meta.yaml                     <-- (Optional) Folder-level metadata
│   ├── cheatsheet.txt
│   ├── cheatsheet.txt.meta.yaml       <-- (Optional) Sidecar metadata for cheatsheet.txt
│   └── tutorials/
│       ├── getting-started.md         <-- Markdown with YAML frontmatter
│       └── deep_dive/                 <-- Deeply nested subfolder
│           └── notes.pdf
└── media/
    ├── diagram.svg
    └── diagram.svg.meta.yaml
```

---

## 2. Default Inferred Metadata

If you don't provide any metadata files, the generator will still automatically extract:
- **Title**: Formatted automatically from the filename.
  - Example: `my-awesome_notes.pdf` becomes `My Awesome Notes`.
- **Category**: Inferred from the file extension (`document`, `markdown`, `image`, `video`, `audio`, `code`, `archive`, `data`, or `other`).
- **File Size**: Stored in bytes and pre-formatted into human-readable units (e.g. `14.2 KB`, `3.5 MB`).
- **Last Modified Date**: Formatted in ISO-8601 UTC.
- **Folder Path**: Inferred from the directory location relative to `resources/`.

---

## 3. Folder-Level Metadata

### Folder Overview (`README.md` or `index.md`)
Place a `README.md` or `index.md` inside any folder. The generator will render this markdown text right at the top of the folder's view in the web catalog.

### Folder Metadata (`_meta.yaml`)
Place a `_meta.yaml` in a folder to customize its display title and short description:

```yaml
title: Design Assets & Brand Guidelines
description: Logos, color palettes, and brand guidelines for web and print.
tags:
  - design
  - branding
```

---

## 4. File-Level Metadata

### Option A: Sidecar Metadata File (`{filename}.meta.yaml`)
For non-markdown files (such as `.pdf`, `.svg`, `.zip`, `.txt`, `.sh`, `.mp4`), you can place a companion YAML file with the same name followed by `.meta.yaml`:

For `cheatsheet.txt`, create `cheatsheet.txt.meta.yaml`:
```yaml
title: Linux & Bash Quick Reference
description: Everyday command line cheatsheet for archive, search, and disk usage commands.
tags:
  - linux
  - bash
  - cheatsheet
author: Jane Doe
```

### Option B: Markdown Frontmatter
For `.md` and `.markdown` files, you can place frontmatter directly at the beginning of the file surrounded by `---`:

```markdown
---
title: Modern Git Workflows
description: Practical guide to trunk-based development and pull requests.
tags:
  - git
  - development
  - best-practices
author: Your Name
---

# Modern Git Workflows

Content starts here...
```

---

## 5. Supported Metadata Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | Custom display title (replaces filename) |
| `description` | string | One or two sentence summary shown on cards and tables |
| `tags` | list of strings | Keywords used for filtering and search |
| `author` | string | Author or contributor name |
| `overview` | markdown string | Extended notes (typically from `README.md`) |

---

## 6. Ignored Files

The generator automatically skips:
- Any file or directory starting with a dot (`.` e.g. `.git`, `.DS_Store`).
- Metadata sidecar files (`_meta.yaml`, `*.meta.yaml`, `_meta.json`, `*.meta.json`).
- Folder overview files (`README.md`, `index.md`) are extracted into folder metadata and not listed as standalone download links.

