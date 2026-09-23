---
title: Modern Git Workflows
description: Practical guide to trunk-based development and pull request best practices.
tags: [git, development, best-practices]
author: Curator
---

# Modern Git Workflows

Git allows teams to coordinate complex changes safely.

### Trunk-Based Development
1. Keep feature branches short-lived (1-2 days max).
2. Merge frequently into main.
3. Use feature flags for unfinished work.

### Commit Hygiene
- Write clear imperative commit messages (`Fix bug in auth header`).
- Rebase on main before opening PRs.

