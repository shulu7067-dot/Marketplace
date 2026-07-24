# Marka — Static Build

This is a plain HTML/CSS/JS rebuild of the Marka marketplace home page —
no React, no TypeScript, no Vite, no npm build step.

## Why the old version was blank

The previous version was a React + TypeScript + Vite project. GitHub Pages
can't run that directly — a GitHub Actions workflow had to run
`npm install`, then `tsc -b` (type-check), then `vite build` before there
was anything to serve. If any part of that chain failed (a TypeScript
error anywhere under `src/` — including in files nothing even imports,
a dependency version mismatch, etc.) the whole deploy failed and the site
stayed blank, with no clue on the page itself.

## Why this version won't do that

There's nothing to compile. `index.html`, `assets/style.css`, and
`assets/app.js` are served exactly as they are. The only external
dependency is the [lucide icon library](https://unpkg.com/lucide@latest/dist/umd/lucide.js),
loaded from a CDN with no build step of its own.

## Deploying

1. Push this repo to GitHub (branch `main`).
2. In the repo settings → **Pages**, set the source to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) will publish the
   site automatically on every push — it just uploads the files, it
   doesn't build anything.

You can also skip Actions entirely: set Pages source to "Deploy from a
branch" → `main` → `/ (root)`, since these are already the final files
GitHub Pages needs.

## Files

- `index.html` — page shell, loads fonts + lucide + the app script
- `assets/style.css` — all styling (same "ledger & tag" palette as before)
- `assets/app.js` — renders categories, featured listings, latest ads,
  and wires up the favorite-heart buttons and bottom nav tabs
