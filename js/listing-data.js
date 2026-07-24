/* ============================================================================
   MARKA — Listing detail data
   Keyed by the SAME ids already used on the home page: Featured items keep
   their id (1–3), grid Listings keep id + 100 (101–106) — the same offset
   home-page.js already uses for their favorite-button ids. That means a
   listing's id here always matches the id the "Show all" / card link points
   to, with nothing to remap.
   ============================================================================ */

const SAFETY_TIPS = [
  "Meet in a public, well-lit location whenever possible.",
  "Inspect the item carefully — and test it — before paying.",
  "Avoid wiring money or paying in full before you see the item in person.",
  "Bring a friend along for higher-value trades if you can.",
  "Trust your instincts: cancel the meeting if something feels off.",
];

// Builds a small gallery from one accent pair so every listing has a few
// visually distinct "photos" without needing real product images.
function buildGallery(c1, c2) {
  return [
    [c1, c2],
    [c2, c1],
    [c1, "#0D1730"],
  ];
}

const LISTING_DETAILS = {
  1: {
    id: 1,
    title: "Coastal 4-bed family home",
    price: "$412,000",
    loc: "Riverside, NY",
    tag: "Property",
    condition: "Excellent",
    datePosted: "Posted 3 days ago",
    grad: ["#2F5D62", "#16213E"],
    images: buildGallery("#2F5D62", "#16213E"),
    description:
      "A bright, well-kept 4-bedroom family home two blocks from the water. The main floor opens onto a renovated kitchen and a south-facing living room, with a private garden out back that's perfect for summer evenings.\n\nRecent updates include a new roof, upgraded insulation, and a repaved driveway. Close to schools, transit, and the Riverside waterfront path.",
    specs: [
      { label: "Bedrooms", value: "4" },
      { label: "Bathrooms", value: "3" },
      { label: "Floor area", value: "240 m²" },
      { label: "Year built", value: "2014" },
      { label: "Parking", value: "Garage (2 cars)" },
      { label: "Heating", value: "Central gas" },
    ],
    seller: { name: "Maria Alonso", initials: "MA", memberSince: "2021", rating: 4.8, deals: 32, verified: true, phone: "+1 (555) 201-4432", email: "maria.alonso@example.com" },
  },
  2: {
    id: 2,
    title: "'98 Land Cruiser, restored",
    price: "$18,500",
    loc: "Queens, NY",
    tag: "Vehicles",
    condition: "Restored",
    datePosted: "Posted 1 day ago",
    grad: ["#C6841F", "#8A5A12"],
    images: buildGallery("#C6841F", "#8A5A12"),
    description:
      "Fully restored '98 Land Cruiser with a rebuilt engine and fresh suspension. Bodywork was stripped and repainted, and the interior has been reupholstered throughout.\n\nEvery service since the restoration is documented. Runs and drives exactly as it should — a rare find in this condition.",
    specs: [
      { label: "Year", value: "1998" },
      { label: "Mileage", value: "142,000 mi" },
      { label: "Transmission", value: "Manual" },
      { label: "Fuel", value: "Diesel" },
      { label: "Engine", value: "4.2L I6" },
      { label: "Drivetrain", value: "4WD" },
    ],
    seller: { name: "Diego Ferreira", initials: "DF", memberSince: "2019", rating: 4.9, deals: 58, verified: true, phone: "+1 (555) 322-1187", email: "diego.ferreira@example.com" },
  },
  3: {
    id: 3,
    title: "Cannondale gravel bike",
    price: "$1,150",
    loc: "Brooklyn, NY",
    tag: "Bikes",
    condition: "Like new",
    datePosted: "Posted 5 hours ago",
    grad: ["#5B4B9A", "#2F5D62"],
    images: buildGallery("#5B4B9A", "#2F5D62"),
    description:
      "Cannondale gravel bike, ridden for one season and always stored indoors. Carbon frame with a Shimano GRX groupset — smooth shifting and reliable braking in all conditions.\n\nNo damage, no crashes. Selling because I'm upgrading frame sizes.",
    specs: [
      { label: "Frame size", value: "56 cm" },
      { label: "Material", value: "Carbon" },
      { label: "Groupset", value: "Shimano GRX" },
      { label: "Wheel size", value: "700c" },
      { label: "Weight", value: "9.1 kg" },
    ],
    seller: { name: "Priya Shah", initials: "PS", memberSince: "2022", rating: 4.7, deals: 14, verified: false, phone: "+1 (555) 481-7723", email: "priya.shah@example.com" },
  },
  101: {
    id: 101,
    title: "Trek Marlin 7 mountain bike",
    price: "$540",
    loc: "Brooklyn, US",
    tag: "Bikes",
    condition: "Used - good",
    datePosted: "Posted 2 hours ago",
    grad: ["#2F5D62", "#16213E"],
    images: buildGallery("#2F5D62", "#16213E"),
    description:
      "Trek Marlin 7 with front suspension, well looked after and ready to ride. A few light cosmetic scuffs on the frame, nothing that affects performance.\n\nGreat all-rounder for commuting or light trail riding.",
    specs: [
      { label: "Frame size", value: "M" },
      { label: "Material", value: "Aluminum" },
      { label: "Suspension", value: "Front (100mm)" },
      { label: "Wheel size", value: '29"' },
      { label: "Brakes", value: "Hydraulic disc" },
    ],
    seller: { name: "Sam Okafor", initials: "SO", memberSince: "2020", rating: 4.6, deals: 21, verified: true, phone: "+1 (555) 664-9021", email: "sam.okafor@example.com" },
  },
  102: {
    id: 102,
    title: "2016 CEO fleet sedan",
    price: "$8,002",
    loc: "New York, US",
    tag: "Vehicles",
    condition: "Used - good",
    datePosted: "Posted 4 hours ago",
    grad: ["#C6841F", "#8A5A12"],
    images: buildGallery("#C6841F", "#8A5A12"),
    description:
      "Single-owner fleet sedan, dealer-maintained with full service history. Clean interior, no mechanical issues, and ready for its next owner.\n\nA dependable daily driver at a fair price.",
    specs: [
      { label: "Year", value: "2016" },
      { label: "Mileage", value: "68,400 mi" },
      { label: "Transmission", value: "Automatic" },
      { label: "Fuel", value: "Gasoline" },
      { label: "Owners", value: "1 (fleet)" },
      { label: "Color", value: "Graphite" },
    ],
    seller: { name: "Fleet Direct Sales", initials: "FD", memberSince: "2018", rating: 4.4, deals: 210, verified: true, phone: "+1 (555) 900-2200", email: "sales@fleetdirect.example.com" },
  },
  103: {
    id: 103,
    title: "Restored '46 roadster",
    price: "$8,999",
    loc: "New York, US",
    tag: "Vehicles",
    condition: "Restored",
    datePosted: "Posted 6 hours ago",
    grad: ["#5B4B9A", "#2F5D62"],
    images: buildGallery("#5B4B9A", "#2F5D62"),
    description:
      "A ground-up restoration finished two years ago and driven sparingly since — mostly weekend shows. Ivory paint over a rebuilt straight-six, with a period-correct convertible top.\n\nA genuine collector's piece, sold with full restoration records.",
    specs: [
      { label: "Year", value: "1946" },
      { label: "Mileage", value: "3,200 mi (since restoration)" },
      { label: "Transmission", value: "Manual" },
      { label: "Engine", value: "3.6L I6" },
      { label: "Body", value: "Convertible" },
      { label: "Color", value: "Ivory" },
    ],
    seller: { name: "Walter Higgins", initials: "WH", memberSince: "2017", rating: 5.0, deals: 9, verified: true, phone: "+1 (555) 118-5563", email: "walter.higgins@example.com" },
  },
  104: {
    id: 104,
    title: "Dual 24in monitor setup",
    price: "$1,020",
    loc: "New York, US",
    tag: "Electronics",
    condition: "Used - like new",
    datePosted: "Posted 9 hours ago",
    grad: ["#16213E", "#0D1730"],
    images: buildGallery("#16213E", "#0D1730"),
    description:
      "Matching pair of 24in monitors on a dual-arm desk mount, barely used. Great for a home office setup — sharp, color-accurate panels with both HDMI and DisplayPort inputs.\n\nSelling as a set; mount and both cables included.",
    specs: [
      { label: "Screen size", value: "24 in ×2" },
      { label: "Resolution", value: "1920×1080" },
      { label: "Refresh rate", value: "75Hz" },
      { label: "Ports", value: "HDMI / DisplayPort" },
      { label: "Stand", value: "Dual-arm mount included" },
    ],
    seller: { name: "Nadia Krol", initials: "NK", memberSince: "2023", rating: 4.9, deals: 6, verified: false, phone: "+1 (555) 733-4409", email: "nadia.krol@example.com" },
  },
  105: {
    id: 105,
    title: "Modern 200m² family house",
    price: "$9,541",
    loc: "New York, US",
    tag: "Property",
    condition: "Excellent",
    datePosted: "Posted 1 day ago",
    grad: ["#2F5D62", "#5B4B9A"],
    images: buildGallery("#2F5D62", "#5B4B9A"),
    description:
      "A modern 5-bedroom build with underfloor heating throughout and a landscaped garden. Open-plan kitchen and living space, plus a driveway with room for three cars.\n\nMove-in ready, with all appliances included.",
    specs: [
      { label: "Bedrooms", value: "5" },
      { label: "Bathrooms", value: "4" },
      { label: "Floor area", value: "200 m²" },
      { label: "Year built", value: "2019" },
      { label: "Parking", value: "Driveway (3 cars)" },
      { label: "Heating", value: "Underfloor" },
    ],
    seller: { name: "Growth Realty Group", initials: "GR", memberSince: "2016", rating: 4.8, deals: 143, verified: true, phone: "+1 (555) 400-1120", email: "listings@growthrealty.example.com" },
  },
  106: {
    id: 106,
    title: "iPhone 14 Pro, unlocked",
    price: "$690",
    loc: "New York, US",
    tag: "Phones",
    condition: "Used - excellent",
    datePosted: "Posted 1 day ago",
    grad: ["#B0472D", "#8A5A12"],
    images: buildGallery("#B0472D", "#8A5A12"),
    description:
      "iPhone 14 Pro, fully unlocked and carrier-free. Always kept in a case with a screen protector, so it's in excellent cosmetic condition with strong battery health.\n\nComes with the original box and charger.",
    specs: [
      { label: "Storage", value: "256GB" },
      { label: "Color", value: "Deep Purple" },
      { label: "Battery health", value: "91%" },
      { label: "Carrier", value: "Unlocked" },
      { label: "Accessories", value: "Original box + charger" },
    ],
    seller: { name: "Leon Brandt", initials: "LB", memberSince: "2021", rating: 4.9, deals: 47, verified: true, phone: "+1 (555) 802-6671", email: "leon.brandt@example.com" },
  },
};
