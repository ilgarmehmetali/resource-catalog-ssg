#!/usr/bin/env python3
"""
Resource Catalog Static Website Generator
KISS & YAGNI: Single-file generator & local preview server.
"""

import argparse
import http.server
import json
import os
import shutil
import socketserver
import textwrap
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


EXTENSION_CATEGORIES = {
    # Documents
    ".pdf": "document",
    ".doc": "document",
    ".docx": "document",
    ".odt": "document",
    ".rtf": "document",
    ".txt": "document",
    ".epub": "document",
    # Markdown
    ".md": "markdown",
    ".markdown": "markdown",
    # Data
    ".csv": "data",
    ".tsv": "data",
    ".json": "data",
    ".xml": "data",
    ".yaml": "data",
    ".yml": "data",
    ".xlsx": "data",
    # Images
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".svg": "image",
    ".webp": "image",
    # Audio & Video
    ".mp3": "audio",
    ".wav": "audio",
    ".ogg": "audio",
    ".mp4": "video",
    ".webm": "video",
    ".mkv": "video",
    # Code & Archives
    ".py": "code",
    ".js": "code",
    ".ts": "code",
    ".sh": "code",
    ".zip": "archive",
    ".tar": "archive",
    ".gz": "archive",
}

IGNORED_NAMES = {
    "readme.md",
    "index.md",
    "_meta.yaml",
    "_meta.yml",
    "_meta.json",
}

IGNORED_SUFFIXES = (
    ".meta.yaml",
    ".meta.yml",
    ".meta.json",
)

DEFAULT_FALLBACK_FILE = Path("locales/tr.json")


def read_strings_file(file_path: Path | None) -> dict:
    """Read and parse strings from a JSON or YAML file."""
    if not file_path or not file_path.is_file():
        return {}
    try:
        content = file_path.read_text(encoding="utf-8")
        if file_path.suffix.lower() == ".json":
            return json.loads(content)
        return parse_yaml(content) or {}
    except Exception:
        return {}


def load_config(config_file: Path | None) -> dict:
    """Load configuration from config.yaml or config.json."""
    if not config_file:
        return {}
    target = config_file
    if not target.is_file():
        for ext in [".yaml", ".yml", ".json"]:
            alt = target.with_suffix(ext)
            if alt.is_file():
                target = alt
                break
        else:
            return {}

    try:
        content = target.read_text(encoding="utf-8")
        if target.suffix.lower() == ".json":
            return json.loads(content)
        return parse_yaml(content)
    except Exception:
        return {}


def load_strings(
    strings_file: Path | None = None,
    config_strings_path: str | None = None,
    fallback_file: Path | None = None,
) -> dict:
    """Load localized strings, merging overrides over a fallback strings file."""
    fb_file = fallback_file or DEFAULT_FALLBACK_FILE
    base_strings = read_strings_file(fb_file)

    target_path = None
    if strings_file:
        target_path = strings_file
    elif config_strings_path:
        target_path = Path(config_strings_path)

    if not target_path or not target_path.is_file():
        for candidate in [
            DEFAULT_FALLBACK_FILE,
            Path("locales/en.json"),
            Path("strings.json"),
            Path("strings.yaml"),
        ]:
            if candidate.is_file():
                target_path = candidate
                break

    if not target_path:
        return base_strings

    try:
        if fb_file and fb_file.is_file() and target_path.resolve() == fb_file.resolve():
            return base_strings
    except Exception:
        pass

    user_strings = read_strings_file(target_path)

    merged = dict(base_strings)
    for k, v in user_strings.items():
        if isinstance(v, dict) and isinstance(merged.get(k), dict):
            merged[k] = {**merged[k], **v}
        else:
            merged[k] = v
    return merged


def interpolate_template(template_str: str, strings: dict) -> str:
    """Replace {{key}} tokens with string values."""
    for key, val in strings.items():
        if isinstance(val, (str, int, float)):
            template_str = template_str.replace(f"{{{{{key}}}}}", str(val))
    return template_str


def get_file_category(extension: str) -> str:
    """Return category identifier for a file extension."""
    return EXTENSION_CATEGORIES.get(extension.lower(), "other")


def format_bytes(size_bytes: int) -> str:
    """Format bytes into readable size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def clean_title_from_filename(filename: str) -> str:
    """Convert filename like 'my_sample-document.pdf' into 'My Sample Document'."""
    stem = Path(filename).stem
    return stem.replace("-", " ").replace("_", " ").title()


def parse_yaml(content: str) -> dict:
    """Parse YAML content using PyYAML or clean standard library fallback."""
    if not content or not content.strip():
        return {}
    dedented = textwrap.dedent(content).strip()
    if yaml is not None:
        try:
            data = yaml.safe_load(dedented)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # Simple standard-library fallback for basic YAML key-value and list properties (no regex)
    data = {}
    current_key = None
    for line in dedented.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("- ") and current_key:
            val = stripped[2:].strip().strip("\"'")
            if not isinstance(data.get(current_key), list):
                data[current_key] = []
            data[current_key].append(val)
        elif ":" in stripped:
            k, v = stripped.split(":", 1)
            k, v = k.strip(), v.strip()
            current_key = k
            if not v:
                continue
            if v.startswith("[") and v.endswith("]"):
                data[k] = [x.strip().strip("\"'") for x in v[1:-1].split(",") if x.strip()]
            elif v.lower() in ("true", "yes"):
                data[k] = True
            elif v.lower() in ("false", "no"):
                data[k] = False
            else:
                data[k] = v.strip("\"'")
    return data


def parse_frontmatter(file_path: Path) -> tuple[dict, str]:
    """Extract YAML frontmatter and markdown body by splitting on '---'."""
    try:
        text = file_path.read_text(encoding="utf-8")
    except Exception:
        return {}, ""

    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            metadata = parse_yaml(parts[1])
            body = parts[2].strip()
            return metadata, body

    return {}, text.strip()


def load_sidecar_metadata(file_path: Path) -> dict:
    """Check for {filename}.meta.yaml or {stem}.meta.yaml."""
    candidates = [
        file_path.with_name(f"{file_path.name}.meta.yaml"),
        file_path.with_name(f"{file_path.name}.meta.yml"),
        file_path.with_name(f"{file_path.stem}.meta.yaml"),
        file_path.with_name(f"{file_path.stem}.meta.yml"),
        file_path.with_name(f"{file_path.name}.meta.json"),
        file_path.with_name(f"{file_path.stem}.meta.json"),
    ]
    for c in candidates:
        if c.is_file():
            try:
                return parse_yaml(c.read_text(encoding="utf-8"))
            except Exception:
                pass
    return {}


def load_folder_metadata(folder_path: Path) -> dict:
    """Load folder-level metadata from _meta.yaml, and README.md / index.md."""
    meta = {}
    for meta_name in ["_meta.yaml", "_meta.yml", "_meta.json"]:
        meta_file = folder_path / meta_name
        if meta_file.is_file():
            try:
                meta = parse_yaml(meta_file.read_text(encoding="utf-8"))
                break
            except Exception:
                pass

    overview_text = ""
    for name in ["README.md", "readme.md", "index.md"]:
        overview_file = folder_path / name
        if overview_file.is_file():
            fm, body = parse_frontmatter(overview_file)
            if fm and not meta:
                meta = fm
            overview_text = body
            break

    meta["overview"] = overview_text
    return meta


def parse_about_file(about_file: Path) -> dict:
    """Parse top-level about.md for the landing view."""
    if not about_file.is_file():
        return {
            "name": "Resource Catalog",
            "tagline": "Curated collection of resources, guides, and files.",
            "bio": "Welcome to our static resource catalog. Browse the collections or search across all resources.",
            "avatar": "",
            "links": [],
        }

    frontmatter, body = parse_frontmatter(about_file)
    return {
        "name": frontmatter.get("name", "Resource Catalog"),
        "tagline": frontmatter.get("tagline", "Curated collection of resources, guides, and files."),
        "avatar": frontmatter.get("avatar", ""),
        "links": frontmatter.get("links", []),
        "bio": body or frontmatter.get("bio", "Welcome to our static resource catalog."),
    }


def is_ignored_file(filename: str) -> bool:
    """Check if file should be ignored during resource indexing."""
    if filename.startswith("."):
        return True
    lower = filename.lower()
    if lower in IGNORED_NAMES:
        return True
    if lower.endswith(IGNORED_SUFFIXES):
        return True
    return False


def scan_catalog(resources_dir: Path) -> dict:
    """Scan resources directory and construct catalog tree & flat items index."""
    resources_dir = resources_dir.resolve()
    if not resources_dir.exists():
        resources_dir.mkdir(parents=True, exist_ok=True)

    items = []
    folders = {}
    all_tags = set()
    category_counts = {}

    for root, dirnames, filenames in os.walk(resources_dir):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        dirnames.sort()

        current_path = Path(root)
        rel_folder = "" if current_path == resources_dir else current_path.relative_to(resources_dir).as_posix()

        folder_meta = load_folder_metadata(current_path)
        folder_title = folder_meta.get("title")
        if not folder_title:
            folder_title = clean_title_from_filename(Path(rel_folder).name) if rel_folder else "Root"

        folders[rel_folder] = {
            "path": rel_folder,
            "title": folder_title,
            "description": folder_meta.get("description", ""),
            "overview": folder_meta.get("overview", ""),
            "subfolders": [f"{rel_folder}/{d}" if rel_folder else d for d in dirnames],
            "item_count": 0,
        }

        for fname in sorted(filenames):
            if is_ignored_file(fname):
                continue

            file_path = current_path / fname
            rel_file_path = file_path.relative_to(resources_dir).as_posix()
            stat = file_path.stat()
            size_bytes = stat.st_size
            mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
            ext = file_path.suffix.lower()
            category = get_file_category(ext)

            item_meta = {}
            if ext in (".md", ".markdown"):
                fm, _ = parse_frontmatter(file_path)
                item_meta.update(fm)

            sidecar = load_sidecar_metadata(file_path)
            item_meta.update(sidecar)

            title = item_meta.get("title") or clean_title_from_filename(fname)
            description = item_meta.get("description", "")
            tags = item_meta.get("tags") or []
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",") if t.strip()]

            for t in tags:
                all_tags.add(t)

            category_counts[category] = category_counts.get(category, 0) + 1

            encoded_rel_path = urllib.parse.quote(rel_file_path, safe="/")

            item = {
                "id": rel_file_path,
                "title": title,
                "filename": fname,
                "path": rel_file_path,
                "url": f"resources/{encoded_rel_path}",
                "folder": rel_folder,
                "extension": ext,
                "category": category,
                "size_bytes": size_bytes,
                "size_formatted": format_bytes(size_bytes),
                "modified": mtime,
                "description": description,
                "tags": tags,
                "author": item_meta.get("author", ""),
            }
            items.append(item)

    # Compute aggregate nested item counts and direct item counts for every folder
    for f_path, f_data in folders.items():
        if not f_path:
            f_data["item_count"] = len(items)
            f_data["direct_item_count"] = sum(1 for it in items if it["folder"] == "")
        else:
            prefix = f"{f_path}/"
            f_data["item_count"] = sum(
                1 for it in items
                if it["folder"] == f_path or it["folder"].startswith(prefix)
            )
            f_data["direct_item_count"] = sum(1 for it in items if it["folder"] == f_path)

    categories_list = [
        {"id": cat, "count": count} for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_items": len(items),
        "total_folders": len(folders),
        "categories": categories_list,
        "tags": sorted(all_tags),
        "folders": folders,
        "items": items,
    }


def build_catalog(
    source_dir: Path,
    output_dir: Path,
    templates_dir: Path,
    about_file: Path,
    config_file: Path | None = None,
    strings_file: Path | None = None,
    fallback_file: Path | None = None,
    clean: bool = False,
) -> Path:
    """Build complete static site into output_dir."""
    source_dir = source_dir.resolve()
    output_dir = output_dir.resolve()
    templates_dir = templates_dir.resolve()
    about_file = about_file.resolve()

    if clean and output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load config and strings
    config_data = load_config(config_file)
    config_strings_path = config_data.get("strings")
    config_fallback_path = config_data.get("fallback_strings")
    fb = fallback_file or (Path(config_fallback_path) if config_fallback_path else None)
    strings = load_strings(
        strings_file=strings_file,
        config_strings_path=config_strings_path,
        fallback_file=fb,
    )

    # 2. Scan resources
    catalog_data = scan_catalog(source_dir)

    # 3. Parse about / site intro info
    about_data = parse_about_file(about_file)
    catalog_data["about"] = about_data
    catalog_data["strings"] = strings

    # 4. Write catalog.json
    catalog_json_path = output_dir / "catalog.json"
    with open(catalog_json_path, "w", encoding="utf-8") as f:
        json.dump(catalog_data, f, indent=2, ensure_ascii=False)

    # 5. Copy templates (interpolate index.html with localized strings, styles.css, app.js)
    if templates_dir.exists():
        for filename in ["index.html", "styles.css", "app.js"]:
            src_file = templates_dir / filename
            if src_file.is_file():
                if filename == "index.html":
                    html_content = src_file.read_text(encoding="utf-8")
                    interpolated = interpolate_template(html_content, strings)
                    (output_dir / filename).write_text(interpolated, encoding="utf-8")
                else:
                    shutil.copy2(src_file, output_dir / filename)

    # 6. Copy resources
    dist_resources_dir = output_dir / "resources"
    if dist_resources_dir.exists():
        shutil.rmtree(dist_resources_dir)
    shutil.copytree(
        source_dir,
        dist_resources_dir,
        ignore=shutil.ignore_patterns(".*", "*_meta.yaml", "*_meta.yml", "*_meta.json", "*.meta.yaml", "*.meta.yml", "*.meta.json"),
    )

    return output_dir


def serve_catalog(directory: Path, port: int = 8000):
    """Serve the static catalog locally with a simple HTTP server."""
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"\n🚀 Serving Resource Catalog at http://localhost:{port}/")
        print("Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


def main():
    parser = argparse.ArgumentParser(
        description="Resource Catalog Static Website Generator",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--source", "-s", default="resources", help="Path to resources directory")
    parser.add_argument("--output", "-o", default="dist", help="Path to output directory")
    parser.add_argument("--templates", "-t", default="templates", help="Path to templates directory")
    parser.add_argument("--about", "-a", default="about.md", help="Path to about introduction markdown")
    parser.add_argument("--config", "-cfg", default="config.yaml", help="Path to config file")
    parser.add_argument("--strings", default=None, help="Path to custom strings file (overrides config)")
    parser.add_argument("--fallback-strings", default=None, help="Path to fallback strings file (defaults to config or locales/tr.json)")
    parser.add_argument("--clean", "-c", action="store_true", help="Clean output directory before building")
    parser.add_argument("--serve", action="store_true", help="Start local preview HTTP server after building")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port for local development server")

    args = parser.parse_args()

    source_path = Path(args.source)
    output_path = Path(args.output)
    templates_path = Path(args.templates)
    about_path = Path(args.about)
    config_path = Path(args.config) if args.config else None
    strings_path = Path(args.strings) if args.strings else None
    fallback_path = Path(args.fallback_strings) if args.fallback_strings else None

    print(f"📦 Building catalog from '{source_path}' -> '{output_path}'...")
    dist_dir = build_catalog(
        source_dir=source_path,
        output_dir=output_path,
        templates_dir=templates_path,
        about_file=about_path,
        config_file=config_path,
        strings_file=strings_path,
        fallback_file=fallback_path,
        clean=args.clean,
    )
    print(f"✨ Build succeeded: static site generated at '{dist_dir}'")

    if args.serve:
        serve_catalog(output_path, args.port)


if __name__ == "__main__":
    main()
