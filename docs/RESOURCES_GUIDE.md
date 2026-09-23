# Adding Resources & Information

A quick guide for adding files, notes, and metadata to the catalog.

[Türkçe Versiyon](RESOURCES_GUIDE_TR.md)

---

## 1. Adding Files

Drop your files anywhere inside the `resources/` folder. You can create subfolders to organize them however you like:

```text
resources/
├── my_document.pdf
├── tutorials/
│   ├── python_basics.md
│   └── architecture_diagram.png
```

- **Folder structure** is automatically mirrored in the catalog navigation.
- **File names** are automatically converted into clean titles (e.g. `python_basics.md` becomes `Python Basics`).
- **File categories & sizes** are detected automatically.

---

## 2. Adding Details (Title, Description, Tags)

If you want to add a custom title, description, tags, or author to a file:

### For Markdown Files (`.md`)

Add a metadata block between `---` at the very top of your `.md` file:

```markdown
---
title: Getting Started with Python
description: A complete beginner guide covering installation and syntax.
tags:
  - python
  - tutorial
author: Jane Doe
---

# Getting Started with Python
Your content starts here...
```

### For All Other Files (`.pdf`, `.png`, `.zip`, etc.)

Create a small `.meta.yaml` file next to your file with the same name.

For example, for `my_document.pdf`, create `my_document.pdf.meta.yaml`:

```yaml
title: Annual Financial Report 2026
description: Detailed balance sheet and quarterly summary.
tags:
  - finance
  - report
author: John Doe
```

---

## 3. Available Fields

| Field | Description | Example |
|---|---|---|
| `title` | The main title shown for the file | `Annual Financial Report 2026` |
| `description` | A short summary shown on the card | `Detailed balance sheet and quarterly summary.` |
| `tags` | Keywords to help people filter and find your file | `[finance, report]` |
| `author` | Author or contributor name | `Jane Doe` |

All fields are optional.

---

## 4. Adding a Folder Introduction (Optional)

To add an introduction text or custom title to a folder:

- **Folder Notes**: Add a `README.md` file inside the folder. Its text will be displayed at the top of that folder's page.
- **Folder Title**: Add a `_meta.yaml` file inside the folder:
  ```yaml
  title: Developer Documentation
  description: Guides, APIs, and setup notes for developers.
  ```




