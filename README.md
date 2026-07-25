# Marka — Marketplace (HTML/CSS/JS)

Plain HTML, CSS, and vanilla JavaScript version of the Marka marketplace —
a straight language port of the original React/TSX project, with the same
layout, colors, fonts, and interactions. No build step, no framework, no
backend.

## Structure

```
index.html            Home page markup
listing.html          Individual listing / product page markup
profile.html          Signed-in user's profile page markup
messages.html         Buyer ↔ seller chat inbox + conversation markup
favorites.html        Dedicated "your saved listings" page
promote.html          Boost/promote-an-ad checkout page
css/style.css         Shared design tokens, layout, and home-page component styles
css/listing.css       Listing-page-only components (breadcrumb, gallery, seller card, etc.)
css/profile.css       Profile-page-only components (header, stats, tabs, reviews, settings)
css/messages.css      Messages-page-only components (thread list, chat bubbles, composer)
css/favorites.css     Favorites-page-only components (header, sort control)
css/promote.css       Promote-page-only components (plan cards, order summary, success state)
js/common.js          Shared nav data + render helpers used by every page
js/script.js          Home page data + rendering + interactivity
js/listing-data.js    Listing detail data (specs, gallery, seller, description)
js/listing.js         Listing page rendering + interactivity
js/profile-data.js    Profile data (user info, stats, reviews, settings menu)
js/profile.js         Profile page rendering + interactivity
js/messages-data.js   Seed conversation/message history for the chat demo
js/messages-store.js  localStorage-backed chat store (send/receive, read
                       receipts, simulated online status + seller replies)
js/messages.js         Messages page rendering + interactivity
js/favorites-store.js  localStorage-backed favorites store shared by every
                        page's heart button
js/favorites.js         Favorites page rendering + sort + remove/clear-all
js/promotions-store.js  localStorage-backed store for ad boosts (plans,
                         active promotion per listing id)
js/promote.js            Promote page rendering + plan selection + checkout
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
`listing.html?id=…` detail page. Click the avatar in the desktop top nav, or
the Profile tab in the mobile bottom nav, to open `profile.html`. Click
"Message Seller" on a listing, the Chat tab in the bottom nav, or the message
icon in the desktop top nav to open `messages.html`.

## Notes

- Fonts (Fraunces, Inter, IBM Plex Mono) load from Google Fonts.
- Icons load from the Lucide CDN.
- Home page data lives in `js/script.js` (`CATEGORIES`, `FEATURED`,
  `LISTINGS`). Listing-detail data lives in `js/listing-data.js`
  (`LISTING_DETAILS`, keyed by the same ids `script.js` already uses for
  favorites — Featured items keep id 1–3, grid Listings use id + 100).
  Profile page data lives in `js/profile-data.js` (`PROFILE`, `MY_LISTING_IDS`,
  `MY_FAVORITE_IDS`, `PROFILE_REVIEWS`, `SETTINGS_ITEMS`) — the listings and
  favorites tabs reuse `LISTING_DETAILS` by id so their cards stay in sync
  with the rest of the site. Swap these for API calls once you build the
  backend.
- Messages data lives in `js/messages-data.js` (`MESSAGE_SEED`, keyed by the
  same numeric `LISTING_DETAILS` ids) and is persisted/mutated through
  `js/messages-store.js`, which also simulates the seller side of a chat
  (typing indicator, a reply, read receipts, online/last-seen status) with
  timeouts so the demo feels live without a backend. Sending a photo stores
  it as a data-URL, the same approach `js/listings-store.js` uses for
  uploaded listing photos. The unread badge on the bottom-nav Chat tab and
  the topbar message icon (`js/common.js`) both read from this store.
- Recently viewed listings (browse.html) are tracked for real via
  `js/recently-viewed-store.js`, which records every listing a visitor opens
  (`recordListingView()`, called from `js/listing.js`) to localStorage and
  falls back to `RECENTLY_VIEWED_IDS` (`js/browse-data.js`) until there's at
  least one real view.
- Blocking a user (from a listing's seller card or a message thread's header)
  is handled by `js/blocked-users-store.js`, keyed by seller name since this
  build has no user-id system. A blocked seller's listings are hidden from
  `browse.html`/`category.html` and the similar-listings row on
  `listing.html`; messaging/calling them is disabled. Manage or reverse
  blocks any time from Profile > Settings > Blocked users.
- Favoriting (the heart button) is backed by `js/favorites-store.js` and
  shared by every page that shows a card — home, browse, category, listing
  (including similar listings), and profile. Favoriting something on any one
  of them is reflected everywhere else and on `favorites.html`, the
  dedicated page reachable from the bottom-nav Favorites tab (which also
  shows a live count badge). `favorites.html` supports sorting and a
  clear-all action, and drops any favorite whose seller has since been
  blocked.
- Promoting/boosting one of your own active ads is handled by
  `js/promotions-store.js` and `promote.html`. Reach it via the rocket-icon
  "Promote" button on an active listing card in Profile > My Listings, or
  the "Promote this ad" button on a real posted ad's own `listing.html`
  page. Three plans (Quick Bump / Featured / Top Ad) each set an expiring
  boost; while active, the ad shows a "Boosted" tag (the same style the
  demo Featured cards already use) on its owned-listing card and on its
  `listing.html` gallery, and can be replaced or removed any time from
  `promote.html`. This is a demo checkout — no real payment is taken.
