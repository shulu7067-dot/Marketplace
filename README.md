# Marketplace

React + TypeScript + Vite project, configured for GitHub Pages deployment. The
Vite `base` is set to `./` (relative), so it deploys correctly no matter what
you name the GitHub repository.

## Local development
```
npm install
npm run dev
```

## Build
```
npm run build
npm run preview
```

## Deploy
Push to `main` — the included GitHub Actions workflow (`.github/workflows/deploy.yml`)
builds and publishes `dist/` automatically.

In your repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## Structure
```
src/
  main.tsx          entry point
  App.tsx           renders HomePage
  home-page.tsx      Home page component
  design-system.tsx  design system / style guide component
  index.css         Tailwind entry
```
