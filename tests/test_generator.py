#!/usr/bin/env python3
"""
Unit tests for the Python Catalog Generator.
Standard library unittest.
"""

import shutil
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from build import (
    clean_title_from_filename,
    format_bytes,
    get_file_category,
    is_ignored_file,
    load_folder_metadata,
    load_sidecar_metadata,
    parse_about_file,
    parse_frontmatter,
    parse_yaml,
    scan_catalog,
    build_catalog,
)


class TestCatalogGenerator(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_get_file_category(self):
        self.assertEqual(get_file_category(".pdf"), "document")
        self.assertEqual(get_file_category(".md"), "markdown")
        self.assertEqual(get_file_category(".svg"), "image")
        self.assertEqual(get_file_category(".py"), "code")
        self.assertEqual(get_file_category(".zip"), "archive")
        self.assertEqual(get_file_category(".other123"), "other")

    def test_format_bytes(self):
        self.assertEqual(format_bytes(500), "500 B")
        self.assertEqual(format_bytes(1024), "1.0 KB")
        self.assertEqual(format_bytes(1048576), "1.0 MB")
        self.assertEqual(format_bytes(1073741824), "1.0 GB")

    def test_clean_title_from_filename(self):
        self.assertEqual(clean_title_from_filename("my-sample-doc.pdf"), "My Sample Doc")
        self.assertEqual(clean_title_from_filename("quick_python_guide.md"), "Quick Python Guide")

    def test_parse_yaml(self):
        yaml_content = """
title: Sample Guide
description: A neat description
tags:
  - python
  - dev
"""
        data = parse_yaml(yaml_content)
        self.assertEqual(data.get("title"), "Sample Guide")
        self.assertEqual(data.get("tags"), ["python", "dev"])

    def test_parse_frontmatter(self):
        doc = self.test_dir / "tutorial.md"
        doc.write_text(
            "---\ntitle: Tutorial Title\ntags: [git, ci]\n---\n# Real Tutorial Body\nSome text.",
            encoding="utf-8",
        )
        fm, body = parse_frontmatter(doc)
        self.assertEqual(fm.get("title"), "Tutorial Title")
        self.assertEqual(fm.get("tags"), ["git", "ci"])
        self.assertIn("# Real Tutorial Body", body)

        # File without frontmatter
        plain = self.test_dir / "plain.md"
        plain.write_text("# Plain Doc", encoding="utf-8")
        fm_plain, body_plain = parse_frontmatter(plain)
        self.assertEqual(fm_plain, {})
        self.assertEqual(body_plain, "# Plain Doc")

    def test_load_sidecar_metadata(self):
        file = self.test_dir / "report.pdf"
        file.write_bytes(b"content")

        sidecar = self.test_dir / "report.pdf.meta.yaml"
        sidecar.write_text("title: Annual Report\ntags: [finance]\n", encoding="utf-8")

        meta = load_sidecar_metadata(file)
        self.assertEqual(meta.get("title"), "Annual Report")
        self.assertEqual(meta.get("tags"), ["finance"])

    def test_load_folder_metadata(self):
        folder = self.test_dir / "guides"
        folder.mkdir()
        (folder / "_meta.yaml").write_text("title: User Guides\n", encoding="utf-8")
        (folder / "README.md").write_text("# Guides Overview\nSome notes.", encoding="utf-8")

        meta = load_folder_metadata(folder)
        self.assertEqual(meta.get("title"), "User Guides")
        self.assertIn("Some notes.", meta.get("overview", ""))

    def test_is_ignored_file(self):
        self.assertTrue(is_ignored_file(".git"))
        self.assertTrue(is_ignored_file("_meta.yaml"))
        self.assertTrue(is_ignored_file("sample.meta.yaml"))
        self.assertTrue(is_ignored_file("README.md"))
        self.assertFalse(is_ignored_file("report.pdf"))

    def test_parse_about_file(self):
        about_file = self.test_dir / "about.md"
        about_file.write_text("---\nname: Alex\ntagline: Writer\n---\nBio text", encoding="utf-8")

        about_data = parse_about_file(about_file)
        self.assertEqual(about_data["name"], "Alex")
        self.assertEqual(about_data["tagline"], "Writer")
        self.assertEqual(about_data["bio"], "Bio text")

    def test_scan_catalog(self):
        res_dir = self.test_dir / "resources"
        sub = res_dir / "docs"
        sub.mkdir(parents=True)

        (sub / "guide.md").write_text("---\ntitle: Guide\ntags: [docs]\n---\nBody", encoding="utf-8")
        (sub / "my sheet.txt").write_text("Sample", encoding="utf-8")

        catalog = scan_catalog(res_dir)
        self.assertEqual(catalog["total_items"], 2)
        self.assertIn("docs", catalog["folders"])

        items = {item["filename"]: item for item in catalog["items"]}
        self.assertEqual(items["guide.md"]["title"], "Guide")
        # Check URL encoding on space
        self.assertEqual(items["my sheet.txt"]["url"], "resources/docs/my%20sheet.txt")

    def test_build_catalog_end_to_end(self):
        source = self.test_dir / "resources"
        source.mkdir()
        (source / "doc.txt").write_text("sample content", encoding="utf-8")

        templates = self.test_dir / "templates"
        templates.mkdir()
        (templates / "index.html").write_text("<html></html>", encoding="utf-8")
        (templates / "styles.css").write_text("body {}", encoding="utf-8")
        (templates / "app.js").write_text("console.log('hi')", encoding="utf-8")

        about = self.test_dir / "about.md"
        about.write_text("---\nname: Alex\n---\nAbout me", encoding="utf-8")

        out = self.test_dir / "dist"
        build_catalog(
            source_dir=source,
            output_dir=out,
            templates_dir=templates,
            about_file=about,
            clean=True,
        )

        self.assertTrue((out / "catalog.json").is_file())
        self.assertTrue((out / "index.html").is_file())
        self.assertTrue((out / "styles.css").is_file())
        self.assertTrue((out / "app.js").is_file())
        self.assertTrue((out / "resources" / "doc.txt").is_file())


if __name__ == "__main__":
    unittest.main()
