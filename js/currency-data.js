/* ============================================================================
   MARKA — Currency detection, selection & formatting
   Every price in the demo data is authored as a plain USD string (e.g.
   "$1,240,000") — this module is the single place that turns those back into
   numbers and re-renders them in whatever currency the shopper actually
   uses, instead of hardcoding USD everywhere.

   Detection order, each one only overriding the last if it's actually known:
     1. An explicit choice the person made (Profile → Settings → Currency),
        persisted in localStorage — always wins once set.
     2. The country implied by a GPS fix + reverse-geocode, the moment one is
        available (see applyDetectedCountry, called from browse.js/sell.js).
     3. The currency implied by the browser's own locale (navigator.language).
     4. USD, as a last resort.

   Conversion uses a small static table of approximate USD exchange rates.
   There's no live FX API wired into this static site, so rates will drift
   out of date — swap ratesFromUSD for a real feed if/when one is available —
   but every price shown stays internally consistent with every other price.
   ============================================================================ */

const CURRENCY_STORAGE_KEY = "marka:currency";

// Intl.NumberFormat's { style: "currency" } only shows a real symbol when the
// *locale* has that currency as its own local currency in CLDR data — e.g.
// formatting ZAR under "en-US" prints the bare ISO code "ZAR" instead of "R",
// because en-US has no notion of what the Rand symbol looks like. Keeping an
// explicit symbol table sidesteps that entirely, so every currency always
// renders with a proper sign regardless of the visitor's browser locale.
const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", CAD: "$", AUD: "$", NZD: "$",
  JPY: "¥", CNY: "¥", HKD: "$", SGD: "$", KRW: "₩",
  INR: "₹", PKR: "₨", BDT: "৳", IDR: "Rp", PHP: "₱", VND: "₫", THB: "฿",
  BRL: "R$", MXN: "$", ARS: "$",
  ZAR: "R", NGN: "₦", KES: "KSh", EGP: "E£",
  AED: "AED", SAR: "SAR", ILS: "₪", TRY: "₺", RUB: "₽",
  CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł",
};

function currencySymbol(currencyCode) {
  const code = currencyCode || getSelectedCurrency();
  return CURRENCY_SYMBOLS[code] || code;
}

const CURRENCIES = {
  USD: { name: "US Dollar", rateFromUSD: 1 },
  EUR: { name: "Euro", rateFromUSD: 0.92 },
  GBP: { name: "British Pound", rateFromUSD: 0.78 },
  CAD: { name: "Canadian Dollar", rateFromUSD: 1.36 },
  AUD: { name: "Australian Dollar", rateFromUSD: 1.52 },
  NZD: { name: "New Zealand Dollar", rateFromUSD: 1.65 },
  JPY: { name: "Japanese Yen", rateFromUSD: 156 },
  CNY: { name: "Chinese Yuan", rateFromUSD: 7.2 },
  HKD: { name: "Hong Kong Dollar", rateFromUSD: 7.82 },
  SGD: { name: "Singapore Dollar", rateFromUSD: 1.35 },
  KRW: { name: "South Korean Won", rateFromUSD: 1380 },
  INR: { name: "Indian Rupee", rateFromUSD: 83.5 },
  PKR: { name: "Pakistani Rupee", rateFromUSD: 279 },
  BDT: { name: "Bangladeshi Taka", rateFromUSD: 122 },
  IDR: { name: "Indonesian Rupiah", rateFromUSD: 16200 },
  PHP: { name: "Philippine Peso", rateFromUSD: 57 },
  VND: { name: "Vietnamese Dong", rateFromUSD: 25400 },
  THB: { name: "Thai Baht", rateFromUSD: 34.5 },
  BRL: { name: "Brazilian Real", rateFromUSD: 5.4 },
  MXN: { name: "Mexican Peso", rateFromUSD: 18.3 },
  ARS: { name: "Argentine Peso", rateFromUSD: 1280 },
  ZAR: { name: "South African Rand", rateFromUSD: 18.1 },
  NGN: { name: "Nigerian Naira", rateFromUSD: 1550 },
  KES: { name: "Kenyan Shilling", rateFromUSD: 129 },
  EGP: { name: "Egyptian Pound", rateFromUSD: 48 },
  AED: { name: "UAE Dirham", rateFromUSD: 3.67 },
  SAR: { name: "Saudi Riyal", rateFromUSD: 3.75 },
  ILS: { name: "Israeli Shekel", rateFromUSD: 3.65 },
  TRY: { name: "Turkish Lira", rateFromUSD: 33 },
  RUB: { name: "Russian Ruble", rateFromUSD: 90 },
  CHF: { name: "Swiss Franc", rateFromUSD: 0.88 },
  SEK: { name: "Swedish Krona", rateFromUSD: 10.4 },
  NOK: { name: "Norwegian Krone", rateFromUSD: 10.6 },
  DKK: { name: "Danish Krone", rateFromUSD: 6.9 },
  PLN: { name: "Polish Zloty", rateFromUSD: 3.95 },
};

// ISO 3166-1 alpha-2 country code -> currency code. Not every country on
// Earth is listed, but this covers the large majority of the world's
// population; anything missing falls back to USD rather than guessing.
const COUNTRY_TO_CURRENCY = {
  US: "USD", PR: "USD", EC: "USD", SV: "USD", PA: "USD",
  GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD",
  JP: "JPY", CN: "CNY", HK: "HKD", SG: "SGD", KR: "KRW",
  IN: "INR", PK: "PKR", BD: "BDT", ID: "IDR", PH: "PHP", VN: "VND", TH: "THB",
  BR: "BRL", MX: "MXN", AR: "ARS",
  ZA: "ZAR", NG: "NGN", KE: "KES", EG: "EGP",
  AE: "AED", SA: "SAR", IL: "ILS", TR: "TRY", RU: "RUB",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR",
  MT: "EUR", HR: "EUR",
};

function currencyForCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || null;
}

// Best-effort guess from the browser's own locale (e.g. "en-GB" -> region
// "GB" -> GBP), used before we know the visitor's country from geolocation.
function currencyFromLocale() {
  try {
    const locale = navigator.language || navigator.userLanguage || "en-US";
    const region = locale.split("-")[1];
    return currencyForCountry(region) || "USD";
  } catch {
    return "USD";
  }
}

function getSelectedCurrency() {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && CURRENCIES[stored]) return stored;
  } catch {
    /* localStorage unavailable — fall through to locale guess */
  }
  return currencyFromLocale();
}

// An explicit choice — e.g. from the Currency picker in Profile → Settings.
function setSelectedCurrency(code) {
  if (!CURRENCIES[code]) return;
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  } catch {
    /* ignore — currency will just fall back to locale detection next load */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marka:currency-changed", { detail: { code } }));
  }
}

// Called once geolocation + reverse-geocoding resolves a real country (see
// browse.js/sell.js "use my location" flows) — only takes effect if the
// person hasn't already picked a currency themselves, so an explicit choice
// is never silently overridden.
function applyDetectedCountry(countryCode) {
  try {
    if (localStorage.getItem(CURRENCY_STORAGE_KEY)) return;
  } catch {
    return;
  }
  const detected = currencyForCountry(countryCode);
  if (!detected) return;
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, detected);
  } catch {
    return;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marka:currency-changed", { detail: { code: detected } }));
  }
}

function getCurrencyOptions() {
  return Object.keys(CURRENCIES).map((code) => ({ code, name: CURRENCIES[code].name }));
}

// Every demo/seed price in the app is authored as a USD string like
// "$1,240,000" — this pulls the underlying number back out so it can be
// converted and re-formatted in another currency.
function parseUSDAmount(value) {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value !== "string") return null;
  const num = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isNaN(num) ? null : num;
}

// navigator.language isn't guaranteed to be a valid BCP-47 tag Intl will
// accept — some OS/locale configurations (e.g. a POSIX-style suffix like
// "en-US@posix") produce a string that throws inside `new Intl.NumberFormat`.
// Validate it once and cache the result, falling back to "en-US" instead of
// letting every caller hit the same exception on every render.
let cachedSafeLocale = null;
function getSafeNumberLocale() {
  if (cachedSafeLocale) return cachedSafeLocale;
  const candidate = (navigator.language || navigator.userLanguage || "en-US").toString();
  try {
    // Throws for malformed tags without needing to format anything.
    Intl.NumberFormat.supportedLocalesOf(candidate);
    cachedSafeLocale = candidate;
  } catch {
    cachedSafeLocale = "en-US";
  }
  return cachedSafeLocale;
}

// Last-resort grouping if Intl.NumberFormat is entirely unavailable (very
// old browsers) — inserts plain "," separators so a big number still reads
// as "25,908,000" instead of "25908000", even without real locale support.
function groupDigitsFallback(numStr) {
  const [whole, frac] = numStr.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

// The single choke point every price display goes through: accepts a raw
// number or one of the app's pre-formatted "$..." demo strings (both treated
// as USD), converts to the shopper's selected currency using the static rate
// table above, and formats with Intl.NumberFormat so grouping/decimal/symbol
// conventions match their currency correctly.
function formatPrice(value, currencyCode) {
  const code = currencyCode || getSelectedCurrency();
  const usd = parseUSDAmount(value);
  if (usd === null) return typeof value === "string" ? value : "";
  const info = CURRENCIES[code] || CURRENCIES.USD;
  const converted = usd * info.rateFromUSD;
  const maximumFractionDigits = converted >= 100 || Number.isInteger(converted) ? 0 : 2;
  let amount;
  try {
    amount = new Intl.NumberFormat(getSafeNumberLocale(), { maximumFractionDigits }).format(converted);
  } catch {
    amount = groupDigitsFallback(converted.toFixed(maximumFractionDigits));
  }
  return `${currencySymbol(code)} ${amount}`;
}
