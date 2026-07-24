# Marka — Marketplace (HTML/CSS/JS)

Plain HTML, CSS, and vanilla JavaScript version of the Marka marketplace —
a straight language port of the original React/TSX project, with the same
layout, colors, fonts, and interactions. No build step, no framework, no
backend.

## Structure

```
index.html          Home page markup
listing.html         Individual listing / product page markup
css/style.css        Shared design tokens, layout, and home-page component styles
css/listing.css      Listing-page-only components (breadcrumb, gallery, seller card, etc.)
js/common.js         Shared nav data + render helpers used by every page
js/script.js         Home page data + rendering + interactivity
js/listing-data.js   Listing detail data (specs, gallery, seller, description)
js/listing.js        Listing page rendering + interactivity
```

## Running it

Open `index.html` in a browser, or serve the folder with any static file
server, e.g.:

```bash
npx serve .
# or
python3 -m http.server
```

Click any Featured or Latest-ads card on the home page to open its
`listing.html?id=…` detail page.

## Notes

- Fonts (Fraunces, Inter, IBM Plex Mono) load from Google Fonts.
- Icons load from the Lucide CDN.
- Home page data lives in `js/script.js` (`CATEGORIES`, `FEATURED`,
  `LISTINGS`). Listing-detail data lives in `js/listing-data.js`
  (`LISTING_DETAILS`, keyed by the same ids `script.js` already uses for
  favorites — Featured items keep id 1–3, grid Listings use id + 100).
  Swap these for API calls once you build the backend.
