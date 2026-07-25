/* ============================================================================
   MARKA — Blog data
   Static seed content for blog.html. No backend — swap BLOG_POSTS for an API
   call once one exists. Each post's body is a plain array of paragraphs so
   js/blog.js can render it without touching HTML markup here.
   ============================================================================ */

const BLOG_POSTS = [
  {
    id: 1,
    title: "6 photo tips that get your ad more replies",
    category: "Selling tips",
    date: "2026-07-14",
    readMins: 4,
    grad: ["#2F5D62", "#16213E"],
    excerpt:
      "Good light and a clean background do more for a listing than any amount of clever copy. Here's what actually moves the needle.",
    body: [
      "Buyers decide whether to open a listing in under two seconds, and almost all of that decision is made from the thumbnail. Before you write a single word of your description, spend five extra minutes on the photo.",
      "Shoot in daylight, ideally near a window, and avoid on-camera flash — it flattens texture and washes out color, which matters a lot for anything secondhand where condition is part of the pitch.",
      "Fill the frame with the item, not the room around it. A cluttered background pulls attention away from what you're actually selling and can make buyers wonder what else is going on in the photo.",
      "Include one wide shot and at least two close-ups of any wear, scratches, or included accessories. Buyers who feel like they already know exactly what they're getting message faster and negotiate less.",
      "Keep a consistent angle across all your photos for the same item — it reads as more trustworthy than five photos taken from five different rooms.",
      "Finally, update the cover photo if a listing goes stale. Marka's search ranks partly on engagement, and a fresher-looking card gets more clicks even with identical text.",
    ],
  },
  {
    id: 2,
    title: "How ad boosts actually work",
    category: "Product",
    date: "2026-07-08",
    readMins: 3,
    grad: ["#C6841F", "#8A5A12"],
    excerpt:
      "Quick Bump, Featured, and Top Ad do different jobs. Here's when each one is worth the money.",
    body: [
      "A boost doesn't change your listing — it changes where and how often it shows up. All three plans are time-limited and can be swapped or cancelled any time from Promote.",
      "Quick Bump re-sorts your ad to the top of its category's \"newest first\" results for a short window. It's the cheapest option and works best for common items where recency, not exposure, is the bottleneck.",
      "Featured adds your ad to the home page's Featured row and gives it a Boosted tag across the site. It's built for higher-value or slower-moving items that benefit from sustained visibility rather than a one-time bump.",
      "Top Ad pins your listing to the top of search results for its category regardless of sort order, and is the most aggressive (and most expensive) option — best reserved for time-sensitive sales.",
      "You can boost any of your own active listings from Profile → My Listings using the rocket icon on the listing card, or from the listing's own page.",
    ],
  },
  {
    id: 3,
    title: "Staying safe when you meet a buyer or seller",
    category: "Safety",
    date: "2026-06-29",
    readMins: 5,
    grad: ["#5B4B9A", "#2F5D62"],
    excerpt:
      "Most trades go fine. A little routine goes a long way for the ones that don't.",
    body: [
      "Meet in a public place with other people around — a busy coffee shop parking lot beats an empty side street, even if it's less convenient for one of you.",
      "For anything valuable, bring someone with you, and let a friend or family member know where you're going and roughly when you expect to be done.",
      "Keep the conversation inside Marka's chat until you've actually met. It gives you a record of what was agreed if something goes wrong, and it's one of the signals we use to catch scammers.",
      "Inspect an item fully before paying, and test anything electronic on the spot if you can. Cash in hand, in person, is still the safest way to pay for most local trades.",
      "If a buyer or seller pressures you to move off-platform immediately, asks for payment before meeting, or a deal feels off in any other way, trust that instinct — block them from your Messages or their listing, and report it from the same menu.",
    ],
  },
  {
    id: 4,
    title: "Pricing secondhand items so they actually sell",
    category: "Selling tips",
    date: "2026-06-18",
    readMins: 4,
    grad: ["#16213E", "#0D1730"],
    excerpt:
      "The difference between a listing that sits for a month and one that sells in a day is usually the number, not the photos.",
    body: [
      "Search Marka (or browse.html directly) for the same or a very similar item before you list anything, and price relative to what's actually moving, not to what you originally paid.",
      "Leave a little room to negotiate — buyers on a marketplace expect it, and a price with 10-15% of headroom tends to close faster than a firm \"final price\" listing for the same item.",
      "If a listing has been up for more than two weeks with no messages, that's a pricing signal, not a photos-or-copy signal. Drop the price before you rewrite the description.",
      "Bundle small, related items instead of listing them one at a time — buyers often want the convenience of a single pickup, and it can move slower-selling accessories along with a flagship item.",
    ],
  },
];
