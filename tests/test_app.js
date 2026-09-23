/**
 * JavaScript Unit Tests for Resource Catalog Web Viewer
 * Pure Node.js built-in test runner (node:test & node:assert)
 * Zero npm dependencies.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeHtml,
  sanitizeUrl,
  parseRoute,
  buildBreadcrumbs,
  filterItems,
  renderMarkdownBasic,
  getCategoryIcon,
} = require("../templates/app.js");

describe("escapeHtml", () => {
  test("handles null, undefined, and non-strings safely", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(123), "123");
    assert.equal(escapeHtml(0), "0");
    assert.equal(escapeHtml(false), "false");
  });

  test("escapes dangerous HTML characters", () => {
    assert.equal(
      escapeHtml('<script>alert("XSS & fun")</script>'),
      '&lt;script&gt;alert(&quot;XSS &amp; fun&quot;)&lt;/script&gt;'
    );
    assert.equal(escapeHtml("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");
  });
});

describe("sanitizeUrl", () => {
  test("permits safe HTTP, HTTPS, mailto, and relative URLs", () => {
    assert.equal(sanitizeUrl("https://example.com/file.pdf"), "https://example.com/file.pdf");
    assert.equal(sanitizeUrl("http://example.com"), "http://example.com");
    assert.equal(sanitizeUrl("mailto:user@example.com"), "mailto:user@example.com");
    assert.equal(sanitizeUrl("#/catalog"), "#/catalog");
    assert.equal(sanitizeUrl("./resources/doc.pdf"), "./resources/doc.pdf");
    assert.equal(sanitizeUrl("resources/doc.pdf"), "resources/doc.pdf");
  });

  test("blocks dangerous protocols such as javascript:, data:, vbscript:, and control char bypasses", () => {
    assert.equal(sanitizeUrl("javascript:alert(1)"), "#");
    assert.equal(sanitizeUrl("JAVASCRIPT:alert(1)"), "#");
    assert.equal(sanitizeUrl("java\tscript:alert(1)"), "#");
    assert.equal(sanitizeUrl("java\nscript:alert(1)"), "#");
    assert.equal(sanitizeUrl("vbscript:MsgBox(1)"), "#");
    assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "#");
    assert.equal(sanitizeUrl("blob:https://example.com/uuid"), "#");
    assert.equal(sanitizeUrl(""), "#");
    assert.equal(sanitizeUrl(null), "#");
  });
});

describe("parseRoute", () => {
  test("defaults to about view when hash is empty or #/about", () => {
    assert.deepEqual(parseRoute(""), { view: "about" });
    assert.deepEqual(parseRoute("#"), { view: "about" });
    assert.deepEqual(parseRoute("#/about"), { view: "about" });
    assert.deepEqual(parseRoute("about"), { view: "about" });
  });

  test("parses catalog root path", () => {
    const route = parseRoute("#/catalog");
    assert.equal(route.view, "catalog");
    assert.equal(route.folder, "");
  });

  test("parses nested catalog folder path", () => {
    const route = parseRoute("#/catalog/documents/tutorials");
    assert.equal(route.view, "catalog");
    assert.equal(route.folder, "documents/tutorials");
  });

  test("parses item detail view route", () => {
    const route = parseRoute("#/item/documents/guide.pdf");
    assert.equal(route.view, "item");
    assert.equal(route.itemPath, "documents/guide.pdf");
  });

  test("parses search query and filter query parameters", () => {
    const route = parseRoute("#/catalog?q=python&type=code&tag=cheatsheet");
    assert.equal(route.view, "catalog");
    assert.equal(route.query, "python");
    assert.equal(route.category, "code");
    assert.equal(route.tag, "cheatsheet");
  });
});

describe("buildBreadcrumbs", () => {
  test("returns root breadcrumb for empty path", () => {
    const crumbs = buildBreadcrumbs("");
    assert.equal(crumbs.length, 1);
    assert.deepEqual(crumbs[0], { title: "Catalog", path: "" });
  });

  test("builds progressive path breadcrumbs for nested folders", () => {
    const crumbs = buildBreadcrumbs("documents/tutorials/deep_dive");
    assert.equal(crumbs.length, 4);
    assert.equal(crumbs[0].path, "");
    assert.equal(crumbs[1].path, "documents");
    assert.equal(crumbs[1].title, "Documents");
    assert.equal(crumbs[2].path, "documents/tutorials");
    assert.equal(crumbs[2].title, "Tutorials");
    assert.equal(crumbs[3].path, "documents/tutorials/deep_dive");
    assert.equal(crumbs[3].title, "Deep Dive");
  });
});

describe("filterItems", () => {
  const sampleItems = [
    {
      title: "Bash Cheatsheet",
      description: "Quick commands for terminal",
      category: "document",
      path: "documents/bash_cheatsheet.pdf",
      folder: "documents",
      tags: ["bash", "cheatsheet"],
    },
    {
      title: "Python Guide",
      description: "Learning Python basics",
      category: "markdown",
      path: "documents/tutorials/python_guide.md",
      folder: "documents/tutorials",
      tags: ["python", "guide"],
    },
    {
      title: "Architecture Diagram",
      description: "Visual workflow representation",
      category: "image",
      path: "media/arch.svg",
      folder: "media",
      tags: ["diagram", "design"],
    },
  ];

  test("returns all items when no filter is applied", () => {
    const results = filterItems(sampleItems, {});
    assert.equal(results.length, 3);
  });

  test("filters by text query in title", () => {
    const results = filterItems(sampleItems, { query: "Bash" });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Bash Cheatsheet");
  });

  test("filters by text query in description", () => {
    const results = filterItems(sampleItems, { query: "terminal" });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Bash Cheatsheet");
  });

  test("filters by text query in tags", () => {
    const results = filterItems(sampleItems, { query: "design" });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Architecture Diagram");
  });

  test("filters by category", () => {
    const results = filterItems(sampleItems, { category: "image" });
    assert.equal(results.length, 1);
    assert.equal(results[0].category, "image");
  });

  test("filters by tag", () => {
    const results = filterItems(sampleItems, { tag: "python" });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Python Guide");
  });

  test("filters by folder recursively", () => {
    const results = filterItems(sampleItems, { folder: "documents", exactFolder: false });
    assert.equal(results.length, 2);
  });

  test("filters by folder strictly when exactFolder is true", () => {
    const results = filterItems(sampleItems, { folder: "documents", exactFolder: true });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Bash Cheatsheet");
  });

  test("combines multiple filters", () => {
    const results = filterItems(sampleItems, {
      query: "guide",
      category: "markdown",
      tag: "python",
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Python Guide");
  });
});

describe("renderMarkdownBasic", () => {
  test("renders headings", () => {
    const md = "# Title 1\n## Title 2\n### Title 3";
    const html = renderMarkdownBasic(md);
    assert.ok(html.includes("<h1>Title 1</h1>"));
    assert.ok(html.includes("<h2>Title 2</h2>"));
    assert.ok(html.includes("<h3>Title 3</h3>"));
  });

  test("renders bold, italic, and inline code", () => {
    const md = "This is **bold** and *italic* and `code` snippet.";
    const html = renderMarkdownBasic(md);
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<em>italic</em>"));
    assert.ok(html.includes("<code>code</code>"));
  });

  test("renders lists", () => {
    const md = "- Item one\n- Item two";
    const html = renderMarkdownBasic(md);
    assert.ok(html.includes("<ul>"));
    assert.ok(html.includes("<li>Item one</li>"));
    assert.ok(html.includes("<li>Item two</li>"));
  });

  test("renders markdown links with sanitized target", () => {
    const md = "Visit [GitHub](https://github.com) now.";
    const html = renderMarkdownBasic(md);
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes("rel=\"noopener\""));
  });

  test("escapes raw HTML tags to prevent XSS", () => {
    const md = "Malicious <script>alert(1)</script> attempt";
    const html = renderMarkdownBasic(md);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  test("handles fenced code blocks and escapes content inside", () => {
    const md = "```\nconst x = <div />;\n```";
    const html = renderMarkdownBasic(md);
    assert.ok(html.includes("<pre><code>"));
    assert.ok(html.includes("&lt;div /&gt;"));
  });
});

describe("getCategoryIcon", () => {
  test("returns appropriate emoji icon for category", () => {
    assert.equal(getCategoryIcon("document"), "📄");
    assert.equal(getCategoryIcon("markdown"), "📝");
    assert.equal(getCategoryIcon("image"), "🖼️");
    assert.equal(getCategoryIcon("code"), "💻");
    assert.equal(getCategoryIcon("video"), "🎬");
    assert.equal(getCategoryIcon("unknown_cat"), "📁");
  });
});
