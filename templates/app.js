/**
 * Resource Catalog Web Viewer
 * KISS & YAGNI principles. Pure Vanilla JavaScript - Zero dependencies.
 */

// --- Escaping and Sanitization Utilities ---

function escapeHtml(val) {
  return String(val ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeUrl(url) {
  if (!url) return "#";
  // Strip control characters and whitespace before protocol check
  const clean = String(url).replace(/[\u0000-\u001F\u007F-\u009F\s]/g, "").toLowerCase();
  const isAllowed =
    clean.startsWith("https://") ||
    clean.startsWith("http://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("tel:") ||
    clean.startsWith("#") ||
    clean.startsWith("/") ||
    clean.startsWith("./") ||
    clean.startsWith("resources/");

  if (!isAllowed) {
    return "#";
  }
  return escapeHtml(String(url).trim());
}

// --- Pure Utility & Routing Functions (Testable) ---

function parseRoute(hashString) {
  const rawHash = hashString !== undefined ? hashString : (typeof window !== "undefined" ? window.location.hash : "");
  let hash = (rawHash || "").replace(/^#\/?/, "");

  if (!hash || hash === "about") {
    return { view: "about" };
  }

  let pathPart = hash;
  let queryString = "";
  const qIndex = hash.indexOf("?");
  if (qIndex !== -1) {
    pathPart = hash.slice(0, qIndex);
    queryString = hash.slice(qIndex + 1);
  }

  const params = new URLSearchParams(queryString);
  const query = params.get("q") || "";
  const category = params.get("category") || params.get("type") || "";
  const tag = params.get("tag") || "";

  if (pathPart.startsWith("item/")) {
    const itemPath = decodeURIComponent(pathPart.slice(5));
    return { view: "item", itemPath };
  }

  if (pathPart.startsWith("catalog")) {
    let folder = pathPart.slice(7).replace(/^\//, "");
    folder = decodeURIComponent(folder);
    return { view: "catalog", folder, query, category, tag };
  }

  return { view: "about" };
}

function buildBreadcrumbs(folderPath) {
  const breadcrumbs = [{ title: "Catalog", path: "" }];
  if (!folderPath) return breadcrumbs;

  const parts = folderPath.split("/").filter(Boolean);
  let accumulated = "";
  for (const part of parts) {
    accumulated = accumulated ? `${accumulated}/${part}` : part;
    const cleanTitle = part.replaceAll("-", " ").replaceAll("_", " ");
    const capitalized = cleanTitle
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
    breadcrumbs.push({ title: capitalized, path: accumulated });
  }
  return breadcrumbs;
}

function filterItems(items, options = {}) {
  const { query = "", category = "", tag = "", folder = null, exactFolder = false } = options;
  const q = query.trim().toLowerCase();

  return items.filter((item) => {
    const itemFolder = item.folder || "";
    if (folder !== null && exactFolder) {
      if (itemFolder !== folder) return false;
    } else if (folder) {
      if (itemFolder !== folder && !itemFolder.startsWith(`${folder}/`)) {
        return false;
      }
    }

    if (category && item.category !== category) {
      return false;
    }

    if (tag && (!item.tags || !item.tags.includes(tag))) {
      return false;
    }

    if (q) {
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchPath = (item.path || "").toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchPath && !matchTags) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Simple, line-based markdown renderer.
 * KISS: no over-engineered parsing, just clear lines and safe HTML escaping.
 */
function renderMarkdownBasic(md) {
  if (!md) return "";

  const lines = md.split(/\r?\n/);
  const output = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let listItems = [];

  function flushList() {
    if (listItems.length > 0) {
      output.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  }

  function renderInline(text) {
    let s = escapeHtml(text);
    // Inline code: `code`
    if (s.includes("`")) {
      s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    }
    // Bold: **text**
    if (s.includes("**")) {
      s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    }
    // Italic: *text*
    if (s.includes("*")) {
      s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
    }
    // Links: [text](url)
    if (s.includes("[") && s.includes("](") && s.includes(")")) {
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
        return `<a href="${sanitizeUrl(href)}" target="_blank" rel="noopener">${label}</a>`;
      });
    }
    return s;
  }

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        output.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    // List item: "- item" or "* item"
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      continue;
    }

    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      output.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      output.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      output.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`);
    } else {
      output.push(`<p>${renderInline(trimmed)}</p>`);
    }
  }

  flushList();
  if (inCodeBlock && codeBuffer.length > 0) {
    output.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  return output.join("\n");
}

function getCategoryIcon(category) {
  const icons = {
    document: "📄",
    markdown: "📝",
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    code: "💻",
    archive: "📦",
    data: "📊",
  };
  return icons[category] || "📁";
}

// --- Browser Application Controller ---

let state = {
  catalog: null,
  viewMode: (typeof localStorage !== "undefined" && localStorage.getItem("catalog_view_mode")) || "grid",
  theme: (typeof localStorage !== "undefined" && localStorage.getItem("catalog_theme")) || "system",
};

async function initApp() {
  setupTheme();
  setupEventListeners();

  try {
    const res = await fetch("catalog.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.catalog = await res.json();
    renderApp();
  } catch (err) {
    const contentEl = document.getElementById("main-content");
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <h2>Unable to load catalog data</h2>
          <p>Please verify that <code>catalog.json</code> exists and the site is served via HTTP/HTTPS.</p>
          <pre>${escapeHtml(err.message)}</pre>
        </div>
      `;
    }
  }

  window.addEventListener("hashchange", renderApp);
}

function setupTheme() {
  if (typeof document === "undefined") return;
  const current = state.theme;
  const isDark =
    current === "dark" ||
    (current === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const nextTheme = isDark ? "light" : "dark";
  state.theme = nextTheme;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("catalog_theme", nextTheme);
  }
  setupTheme();
}

function copyToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Link copied to clipboard!"))
      .catch(() => showToast("Failed to copy link"));
  }
}

function showToast(message) {
  if (typeof document === "undefined") return;
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function setupEventListeners() {
  if (typeof document === "undefined") return;

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      const currentRoute = parseRoute();
      if (q) {
        window.location.hash = `#/catalog?q=${encodeURIComponent(q)}`;
      } else if (currentRoute.view === "catalog") {
        window.location.hash = currentRoute.folder ? `#/catalog/${encodeURI(currentRoute.folder)}` : `#/catalog`;
      }
    });
  }

  // Event delegation
  document.addEventListener("click", (e) => {
    const copyTarget = e.target.closest("[data-copy-url]");
    if (copyTarget) {
      const url = copyTarget.getAttribute("data-copy-url") || window.location.href;
      copyToClipboard(url);
      return;
    }

    const viewModeTarget = e.target.closest("[data-view-mode]");
    if (viewModeTarget) {
      const mode = viewModeTarget.getAttribute("data-view-mode");
      if (mode) setViewMode(mode);
      return;
    }
  });
}

function renderApp() {
  if (!state.catalog || typeof document === "undefined") return;

  const route = parseRoute();
  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.value = route.query || "";
  }

  // Update active nav links
  document.querySelectorAll("nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (route.view === "about" && href === "#/about") {
      a.classList.add("active");
    } else if (route.view !== "about" && href.startsWith("#/catalog")) {
      a.classList.add("active");
    } else {
      a.classList.remove("active");
    }
  });

  const contentEl = document.getElementById("main-content");
  if (!contentEl) return;

  if (route.view === "about") {
    contentEl.innerHTML = renderAboutView(state.catalog.about, state.catalog);
  } else if (route.view === "item") {
    contentEl.innerHTML = renderItemModalOrView(route.itemPath);
  } else {
    contentEl.innerHTML = renderCatalogView(route);
  }
}

function renderAboutView(about = {}, catalog = {}) {
  const authorName = escapeHtml(about.name || "Resource Catalog");
  const tagline = escapeHtml(about.tagline || "");
  const bioHtml = renderMarkdownBasic(about.bio || "");
  const avatar = about.avatar
    ? `<img src="${sanitizeUrl(about.avatar)}" alt="${authorName}" class="author-avatar" />`
    : `<div class="avatar-placeholder">📚</div>`;

  const links = (about.links || [])
    .map(
      (l) =>
        `<a href="${sanitizeUrl(l.url)}" target="_blank" rel="noopener" class="author-link-badge">
          ${escapeHtml(l.title || l.url)} ↗
        </a>`
    )
    .join("");

  return `
    <div class="about-page">
      <div class="about-hero">
        <div class="about-avatar-container">
          ${avatar}
        </div>
        <div class="about-hero-text">
          <h1 class="author-name">${authorName}</h1>
          ${tagline ? `<p class="author-tagline">${tagline}</p>` : ""}
          <div class="author-links">${links}</div>
        </div>
      </div>

      <div class="about-stats-grid">
        <div class="stat-card">
          <span class="stat-number">${catalog.total_items || 0}</span>
          <span class="stat-label">Total Resources</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${catalog.total_folders || 0}</span>
          <span class="stat-label">Folders</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${(catalog.categories || []).length}</span>
          <span class="stat-label">Categories</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${(catalog.tags || []).length}</span>
          <span class="stat-label">Tags</span>
        </div>
      </div>

      <div class="about-bio markdown-body">
        ${bioHtml}
      </div>

      <div class="about-cta-container">
        <a href="#/catalog" class="btn btn-primary cta-btn">
          Explore the Catalog →
        </a>
      </div>
    </div>
  `;
}

function renderCatalogView(route) {
  const { folder = "", query = "", category = "", tag = "" } = route;
  const isGlobalSearch = Boolean(query || category || tag);

  const filteredItems = filterItems(state.catalog.items || [], {
    query,
    category,
    tag,
    folder: isGlobalSearch ? "" : folder,
    exactFolder: !isGlobalSearch,
  });

  const folderData = (state.catalog.folders && state.catalog.folders[folder]) || {
    overview: "",
    subfolders: [],
  };

  const breadcrumbsHtml = renderBreadcrumbsHtml(folder, isGlobalSearch);
  const subfoldersHtml = !isGlobalSearch ? renderSubfoldersHtml(folderData.subfolders) : "";
  const overviewHtml = folderData.overview
    ? `<div class="folder-overview markdown-body">${renderMarkdownBasic(folderData.overview)}</div>`
    : "";

  const categoryPillsHtml = renderCategoryPills(category, route);
  const itemsListHtml = renderItemsList(filteredItems);

  return `
    <div class="catalog-layout">
      <div class="catalog-header-bar">
        <div class="breadcrumbs-container">${breadcrumbsHtml}</div>
        <div class="catalog-actions">
          <button class="btn btn-sm btn-outline" data-copy-url="" title="Share link to this view">
            🔗 Share Link
          </button>
          <div class="view-toggle">
            <button class="btn btn-sm ${state.viewMode === "grid" ? "active" : ""}" data-view-mode="grid">
              🔲 Grid
            </button>
            <button class="btn btn-sm ${state.viewMode === "table" ? "active" : ""}" data-view-mode="table">
              📑 Table
            </button>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        ${categoryPillsHtml}
      </div>

      ${overviewHtml}
      ${subfoldersHtml}

      <div class="results-header">
        <span class="results-count">
          ${filteredItems.length} ${filteredItems.length === 1 ? "resource" : "resources"} found
        </span>
        ${
          isGlobalSearch
            ? `<a href="#/catalog${folder ? `/${encodeURI(folder)}` : ""}" class="clear-filters-link">Clear filters ×</a>`
            : ""
        }
      </div>

      <div class="resources-container ${escapeHtml(state.viewMode)}">
        ${itemsListHtml}
      </div>
    </div>
  `;
}

function setViewMode(mode) {
  state.viewMode = mode;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("catalog_view_mode", mode);
  }
  renderApp();
}

function renderBreadcrumbsHtml(folder, isSearch) {
  if (isSearch) {
    return `<a href="#/catalog">Catalog</a> <span class="sep">/</span> <span>Search Results</span>`;
  }
  const crumbs = buildBreadcrumbs(folder);
  return crumbs
    .map((c, i) => {
      const isLast = i === crumbs.length - 1;
      const safeTitle = escapeHtml(c.title);
      if (isLast) return `<span class="current">${safeTitle}</span>`;
      const href = c.path ? `#/catalog/${encodeURI(c.path)}` : "#/catalog";
      return `<a href="${href}">${safeTitle}</a> <span class="sep">/</span> `;
    })
    .join("");
}

function renderCategoryPills(activeCategory, route) {
  const categories = state.catalog.categories || [];
  const baseHash = route.folder ? `#/catalog/${encodeURI(route.folder)}` : "#/catalog";

  const allPill = `
    <a href="${baseHash}" class="filter-pill ${!activeCategory ? "active" : ""}">
      All (${state.catalog.total_items || 0})
    </a>
  `;

  const pills = categories
    .map((cat) => {
      const isActive = activeCategory === cat.id;
      const targetHash = isActive ? baseHash : `${baseHash}?category=${encodeURIComponent(cat.id)}`;
      return `
        <a href="${targetHash}" class="filter-pill ${isActive ? "active" : ""}">
          ${getCategoryIcon(cat.id)} ${escapeHtml(cat.id)} (${cat.count || 0})
        </a>
      `;
    })
    .join("");

  return `<div class="pills-scroll">${allPill}${pills}</div>`;
}

function renderSubfoldersHtml(subfolders) {
  if (!subfolders || subfolders.length === 0) return "";
  const cards = subfolders
    .map((sf) => {
      const data = (state.catalog.folders && state.catalog.folders[sf]) || {};
      const name = data.title || sf.split("/").pop();
      return `
        <a href="#/catalog/${encodeURI(sf)}" class="subfolder-card">
          <span class="subfolder-icon">📁</span>
          <div class="subfolder-info">
            <span class="subfolder-title">${escapeHtml(name)}</span>
            <span class="subfolder-count">${escapeHtml(data.item_count || 0)} items</span>
          </div>
        </a>
      `;
    })
    .join("");

  return `
    <div class="subfolders-section">
      <h3 class="section-title">Subfolders</h3>
      <div class="subfolders-grid">${cards}</div>
    </div>
  `;
}

function renderItemsList(items) {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <p>No resources match your current selection.</p>
      </div>
    `;
  }

  if (state.viewMode === "table") {
    const rows = items
      .map(
        (item) => `
        <tr>
          <td class="col-icon">${getCategoryIcon(item.category)}</td>
          <td class="col-title">
            <a href="#/item/${encodeURIComponent(item.path)}" class="item-link">
              ${escapeHtml(item.title)}
            </a>
            ${item.description ? `<p class="item-table-desc">${escapeHtml(item.description)}</p>` : ""}
          </td>
          <td class="col-category"><span class="badge">${escapeHtml(item.category)}</span></td>
          <td class="col-size">${escapeHtml(item.size_formatted)}</td>
          <td class="col-tags">
            ${(item.tags || []).map((t) => `<a href="#/catalog?tag=${encodeURIComponent(t)}" class="tag-pill">${escapeHtml(t)}</a>`).join(" ")}
          </td>
          <td class="col-actions">
            <a href="${sanitizeUrl(item.url)}" download class="btn btn-sm btn-primary" title="Download">⬇️</a>
            <a href="${sanitizeUrl(item.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" title="Open directly">↗️</a>
          </td>
        </tr>
      `
      )
      .join("");

    return `
      <div class="table-wrapper">
        <table class="catalog-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th>Size</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // Grid view
  return items
    .map((item) => {
      const tagsHtml = (item.tags || [])
        .map((t) => `<a href="#/catalog?tag=${encodeURIComponent(t)}" class="tag-pill">#${escapeHtml(t)}</a>`)
        .join("");

      const itemShareUrl = typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}#/item/${encodeURIComponent(item.path)}`
        : `#/item/${encodeURIComponent(item.path)}`;

      return `
        <div class="resource-card">
          <div class="card-header">
            <span class="card-icon">${getCategoryIcon(item.category)}</span>
            <span class="badge">${escapeHtml(item.category)}</span>
          </div>
          <div class="card-body">
            <a href="#/item/${encodeURIComponent(item.path)}" class="card-title-link">
              <h4 class="card-title">${escapeHtml(item.title)}</h4>
            </a>
            ${item.description ? `<p class="card-desc">${escapeHtml(item.description)}</p>` : ""}
            <div class="card-meta">
              <span class="card-size">${escapeHtml(item.size_formatted)}</span>
              <span class="card-ext">${escapeHtml(item.extension)}</span>
            </div>
            ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}
          </div>
          <div class="card-footer">
            <a href="${sanitizeUrl(item.url)}" download class="btn btn-sm btn-primary">Download</a>
            <a href="${sanitizeUrl(item.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Open</a>
            <button class="btn btn-sm btn-ghost" data-copy-url="${escapeHtml(itemShareUrl)}" title="Copy item link">🔗</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderItemModalOrView(itemPath) {
  const item = (state.catalog.items || []).find((i) => i.path === itemPath);
  if (!item) {
    return `
      <div class="empty-state">
        <h2>Resource Not Found</h2>
        <p>Could not find item at path: <code>${escapeHtml(itemPath)}</code></p>
        <a href="#/catalog" class="btn btn-primary">Return to Catalog</a>
      </div>
    `;
  }

  const tagsHtml = (item.tags || [])
    .map((t) => `<a href="#/catalog?tag=${encodeURIComponent(t)}" class="tag-pill">#${escapeHtml(t)}</a>`)
    .join(" ");

  const backFolder = item.folder ? `#/catalog/${encodeURI(item.folder)}` : "#/catalog";

  let previewContent = "";
  if (item.category === "image") {
    previewContent = `
      <div class="media-preview image-preview">
        <img src="${sanitizeUrl(item.url)}" alt="${escapeHtml(item.title)}" style="max-width:100%; border-radius:8px;" />
      </div>
    `;
  } else if (item.category === "video") {
    previewContent = `
      <div class="media-preview video-preview">
        <video controls src="${sanitizeUrl(item.url)}" style="max-width:100%; border-radius:8px;"></video>
      </div>
    `;
  } else if (item.category === "audio") {
    previewContent = `
      <div class="media-preview audio-preview">
        <audio controls src="${sanitizeUrl(item.url)}" style="width:100%;"></audio>
      </div>
    `;
  } else if (item.category === "markdown" || item.category === "code" || item.extension === ".txt") {
    previewContent = `
      <div class="text-preview-box">
        <p><em>Text preview loading...</em></p>
        <pre><code id="file-raw-content">Loading content...</code></pre>
      </div>
    `;
    fetch(item.url)
      .then((r) => r.text())
      .then((t) => {
        const codeEl = document.getElementById("file-raw-content");
        if (codeEl) codeEl.textContent = t.slice(0, 50000);
      })
      .catch(() => {});
  }

  return `
    <div class="item-detail-view">
      <div class="item-detail-header">
        <a href="${backFolder}" class="back-link">← Back to folder</a>
        <button class="btn btn-sm btn-outline" data-copy-url="">🔗 Copy Share Link</button>
      </div>

      <div class="item-detail-card">
        <div class="item-detail-top">
          <span class="detail-icon">${getCategoryIcon(item.category)}</span>
          <div>
            <h2 class="detail-title">${escapeHtml(item.title)}</h2>
            <p class="detail-filename">${escapeHtml(item.filename)}</p>
          </div>
        </div>

        ${item.description ? `<p class="detail-desc">${escapeHtml(item.description)}</p>` : ""}

        <div class="detail-meta-grid">
          <div><strong>Category:</strong> ${escapeHtml(item.category)}</div>
          <div><strong>Size:</strong> ${escapeHtml(item.size_formatted)} (${escapeHtml(item.size_bytes.toLocaleString())} bytes)</div>
          <div><strong>Path:</strong> <code>${escapeHtml(item.path)}</code></div>
          <div><strong>Last Modified:</strong> ${escapeHtml(new Date(item.modified).toLocaleDateString())}</div>
          ${item.author ? `<div><strong>Author:</strong> ${escapeHtml(item.author)}</div>` : ""}
        </div>

        ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ""}

        ${previewContent}

        <div class="detail-actions">
          <a href="${sanitizeUrl(item.url)}" download class="btn btn-primary">⬇️ Download File</a>
          <a href="${sanitizeUrl(item.url)}" target="_blank" rel="noopener" class="btn btn-outline">↗️ Open in New Tab</a>
        </div>
      </div>
    </div>
  `;
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initApp);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    escapeHtml,
    sanitizeUrl,
    parseRoute,
    buildBreadcrumbs,
    filterItems,
    renderMarkdownBasic,
    getCategoryIcon,
  };
}

