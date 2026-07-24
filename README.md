# Marka — Marketplace (HTML/CSS/JS)

This is a plain HTML, CSS, and vanilla JavaScript version of the Marka
marketplace home page — a straight language port of the original React/TSX
project, with the same layout, colors, fonts, and interactions. No build
step, no framework, no backend.

## Structure

```
index.html      Page markup
css/style.css   Design tokens, layout, and responsive styles
js/script.js    Mock data + rendering + interactivity (favorites, bottom nav tabs)
```

## Running it

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```bash
npx serve .
# or
python3 -m http.server
```

## Notes

- Fonts (Fraunces, Inter, IBM Plex Mono) load from Google Fonts.
- Icons load from the Lucide CDN.
- All listing/category data currently lives in `js/script.js` as plain
  JavaScript arrays (`CATEGORIES`, `FEATURED`, `LISTINGS`) — swap these out
  or fetch them from an API once you build the backend.
