/* ============================================================================
   MARKA — Location data & geo helpers
   Backs the Province filter, City filter, Distance search, Map view, and the
   GPS location picker on the Sell page. No backend/geocoding API key is
   required for the seeded data below; the GPS picker additionally calls the
   free OpenStreetMap Nominatim API (reverse geocoding) at runtime, and the
   map views render OpenStreetMap tiles via Leaflet (both loaded from CDN).

   PROVINCES: ordered list of { code, name, cities: { CityName: {lat,lng} } }.
   Every listing in js/listing-data.js is keyed to one of these province/city
   pairs so the cascading filters, distance search, and map pins all agree on
   the same coordinates.
   ============================================================================ */

const PROVINCES = [
  {
    code: "NY",
    name: "New York",
    cities: {
      "Riverside": { lat: 40.8074, lng: -73.9727 },
      "Queens": { lat: 40.7282, lng: -73.7949 },
      "Brooklyn": { lat: 40.6782, lng: -73.9442 },
      "Manhattan": { lat: 40.758, lng: -73.9855 },
      "Buffalo": { lat: 42.8864, lng: -78.8784 },
      "Albany": { lat: 42.6526, lng: -73.7562 },
    },
  },
  {
    code: "NJ",
    name: "New Jersey",
    cities: {
      "Hoboken": { lat: 40.7439, lng: -74.0324 },
      "Jersey City": { lat: 40.7178, lng: -74.0431 },
      "Newark": { lat: 40.7357, lng: -74.1724 },
      "Princeton": { lat: 40.3573, lng: -74.6672 },
    },
  },
  {
    code: "CT",
    name: "Connecticut",
    cities: {
      "Stamford": { lat: 41.0534, lng: -73.5387 },
      "Hartford": { lat: 41.7658, lng: -72.6734 },
      "New Haven": { lat: 41.3083, lng: -72.9279 },
    },
  },
  {
    code: "PA",
    name: "Pennsylvania",
    cities: {
      "Philadelphia": { lat: 39.9526, lng: -75.1652 },
      "Pittsburgh": { lat: 40.4406, lng: -79.9959 },
      "Allentown": { lat: 40.6023, lng: -75.4714 },
    },
  },
  {
    code: "MA",
    name: "Massachusetts",
    cities: {
      "Boston": { lat: 42.3601, lng: -71.0589 },
      "Cambridge": { lat: 42.3736, lng: -71.1097 },
      "Worcester": { lat: 42.2626, lng: -71.8023 },
    },
  },
  {
    code: "CA",
    name: "California",
    cities: {
      "Los Angeles": { lat: 34.0522, lng: -118.2437 },
      "San Francisco": { lat: 37.7749, lng: -122.4194 },
      "San Diego": { lat: 32.7157, lng: -117.1611 },
    },
  },
];

function findProvince(code) {
  return PROVINCES.find((p) => p.code === code) || null;
}

function getProvinceOptions() {
  return PROVINCES.map((p) => ({ code: p.code, name: p.name }));
}

function getCityOptions(provinceCode) {
  const p = findProvince(provinceCode);
  return p ? Object.keys(p.cities) : [];
}

function getCityCoords(provinceCode, city) {
  const p = findProvince(provinceCode);
  if (!p || !p.cities[city]) return null;
  return p.cities[city];
}

// Finds the closest seeded city to an arbitrary lat/lng — used by the GPS
// picker to snap a browser geolocation result (or a Nominatim reverse-geocode
// miss) onto one of the province/city pairs the rest of the app understands.
function findNearestCity(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const p of PROVINCES) {
    for (const [city, coords] of Object.entries(p.cities)) {
      const d = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
      if (d < bestDist) {
        bestDist = d;
        best = { province: p.code, provinceName: p.name, city, lat: coords.lat, lng: coords.lng, distanceKm: d };
      }
    }
  }
  return best;
}

/* --------------------------------- Distance math -------------------------------- */
const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => typeof v !== "number" || Number.isNaN(v))) return null;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const KM_TO_MI = 0.621371;

function formatDistance(km, unit = "km") {
  if (km === null || km === undefined || Number.isNaN(km)) return "";
  const val = unit === "mi" ? km * KM_TO_MI : km;
  const label = unit === "mi" ? "mi" : "km";
  if (val < 1) return `<1 ${label} away`;
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${label} away`;
}

const DISTANCE_RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

/* --------------------------------- User location (session) ---------------------- */
// Session-only (not persisted) — every page that supports distance search
// re-requests permission, same as any map app would. Kept here so browse.js
// and sell.js share one in-memory shape.
const userGeoState = { lat: null, lng: null, status: "idle", error: null }; // status: idle|locating|granted|denied|error

function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      userGeoState.status = "error";
      userGeoState.error = "Geolocation isn't supported by this browser.";
      reject(new Error(userGeoState.error));
      return;
    }
    userGeoState.status = "locating";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userGeoState.lat = pos.coords.latitude;
        userGeoState.lng = pos.coords.longitude;
        userGeoState.status = "granted";
        userGeoState.error = null;
        resolve({ lat: userGeoState.lat, lng: userGeoState.lng });
      },
      (err) => {
        userGeoState.status = err.code === err.PERMISSION_DENIED ? "denied" : "error";
        userGeoState.error = err.message || "Couldn't determine your location.";
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Best-effort reverse geocode via OpenStreetMap's free Nominatim API — used
// only to prefill a human-readable place name; the app still snaps to the
// nearest seeded city (findNearestCity) for filtering/distance purposes.
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.suburb || null,
      state: addr.state || null,
      display: data.display_name || null,
    };
  } catch {
    return null; // offline or blocked — caller falls back to findNearestCity
  }
}
