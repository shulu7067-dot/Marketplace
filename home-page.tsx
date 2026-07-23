import React, { useState, useEffect } from "react";
import {
  Search, Heart, MapPin, Bell, Menu, Plus, Car, Bike, Home as HomeIcon,
  Monitor, Smartphone, Grid3x3, ChevronRight, Zap, User, ArrowRight, SlidersHorizontal,
} from "lucide-react";

/* ============================================================================
   MARKA — Home page
   Same "ledger & tag" identity as the design system: ink navy, brass accent,
   ledger teal, warm paper background, Fraunces + Inter + IBM Plex Mono.
   Layout influenced by familiar marketplace patterns (search → categories →
   featured → latest listings → bottom nav) but rebuilt in Marka's own visual language.
   ============================================================================ */

function useFonts() {
  useEffect(() => {
    const id = "marka-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const F = {
  display: "'Fraunces', ui-serif, Georgia, serif",
  body: "'Inter', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

const t = {
  bg: "#F5F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEEE7",
  border: "#E2E0D5",
  textPrimary: "#161B2C",
  textSecondary: "#5B6070",
  textTertiary: "#8A8E9B",
  primary: "#16213E",
  secondary: "#2F5D62",
  accent: "#C6841F",
  accentSoft: "#F7E8CE",
  success: "#1F8A4C",
  successSoft: "#DFF3E6",
};

/* --------------------------------- Mock data -------------------------------- */
const CATEGORIES = [
  { label: "Vehicles", icon: Car, color: "#2F5D62", bg: "#E4EEEE" },
  { label: "Bikes", icon: Bike, color: "#5B4B9A", bg: "#ECE8F6" },
  { label: "Property", icon: HomeIcon, color: "#C6841F", bg: "#F7E8CE" },
  { label: "Electronics", icon: Monitor, color: "#B0472D", bg: "#F6E2DC" },
  { label: "Phones", icon: Smartphone, color: "#1F8A4C", bg: "#DFF3E6" },
  { label: "All categories", icon: Grid3x3, color: "#16213E", bg: "#E7EAF2" },
];

const FEATURED = [
  { id: 1, title: "Coastal 4-bed family home", price: "$412,000", loc: "Riverside, NY", tag: "Property", boosted: true, grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "'98 Land Cruiser, restored", price: "$18,500", loc: "Queens, NY", tag: "Vehicles", boosted: true, grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Cannondale gravel bike", price: "$1,150", loc: "Brooklyn, NY", tag: "Bikes", boosted: false, grad: ["#5B4B9A", "#2F5D62"] },
];

const LISTINGS = [
  { id: 1, title: "Trek Marlin 7 mountain bike", price: "$540", loc: "Brooklyn, US", time: "2h", grad: ["#2F5D62", "#16213E"] },
  { id: 2, title: "2016 CEO fleet sedan", price: "$8,002", loc: "New York, US", time: "4h", grad: ["#C6841F", "#8A5A12"] },
  { id: 3, title: "Restored '46 roadster", price: "$8,999", loc: "New York, US", time: "6h", grad: ["#5B4B9A", "#2F5D62"] },
  { id: 4, title: "Dual 24in monitor setup", price: "$1,020", loc: "New York, US", time: "9h", grad: ["#16213E", "#0D1730"] },
  { id: 5, title: "Modern 200m² family house", price: "$9,541", loc: "New York, US", time: "1d", grad: ["#2F5D62", "#5B4B9A"] },
  { id: 6, title: "iPhone 14 Pro, unlocked", price: "$690", loc: "New York, US", time: "1d", grad: ["#B0472D", "#8A5A12"] },
];

/* ---------------------------------- Pieces ---------------------------------- */
function PriceStub({ price }) {
  return (
    <div className="relative inline-flex" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" }}>
      <div className="px-2.5 py-1" style={{ background: t.primary, color: "#fff", borderRadius: "7px 2px 2px 7px", position: "relative" }}>
        <span style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 600, lineHeight: 1 }}>{price}</span>
        <span className="absolute" style={{ right: -1, top: "50%", transform: "translateY(-50%)", width: 8, height: 8, borderRadius: "50%", background: t.bg }} />
      </div>
    </div>
  );
}

function FavButton({ active, onClick, dark }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        width: 32, height: 32, borderRadius: 999, cursor: "pointer", border: "none",
        background: dark ? "rgba(255,255,255,0.9)" : "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      }}
    >
      <Heart size={15} color={active ? "#C13F3F" : t.primary} fill={active ? "#C13F3F" : "none"} />
    </button>
  );
}

function ListingCard({ item, fav, toggleFav }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 128, background: `linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})`, position: "relative" }}>
        <div className="absolute top-2 right-2"><FavButton active={fav} onClick={() => toggleFav(item.id)} /></div>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold leading-snug truncate" style={{ color: t.textPrimary, fontFamily: F.body }}>{item.title}</div>
        <div className="flex items-center gap-1 text-xs mt-1" style={{ color: t.textTertiary }}>
          <MapPin size={11} /><span className="truncate">{item.loc}</span>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <PriceStub price={item.price} />
          <span className="text-[11px]" style={{ color: t.textTertiary, fontFamily: F.mono }}>{item.time} ago</span>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ item, fav, toggleFav }) {
  return (
    <div style={{ minWidth: 220, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: 130, background: `linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})`, position: "relative" }}>
        {item.boosted && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1" style={{ background: t.accentSoft, color: t.accent, borderRadius: 999 }}>
            <Zap size={11} /> Boosted
          </div>
        )}
        <div className="absolute top-2 right-2"><FavButton active={fav} onClick={() => toggleFav(item.id)} /></div>
      </div>
      <div className="p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: t.textTertiary, fontFamily: F.mono }}>{item.tag}</div>
        <div className="text-sm font-semibold leading-snug" style={{ color: t.textPrimary }}>{item.title}</div>
        <div className="flex items-center justify-between mt-2.5">
          <PriceStub price={item.price} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------ App ----------------------------------- */
export default function App() {
  useFonts();
  const [favs, setFavs] = useState({});
  const [tab, setTab] = useState("home");
  const toggleFav = (id) => setFavs((f) => ({ ...f, [id]: !f[id] }));

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: F.body }}>
      <div className="max-w-md mx-auto" style={{ background: t.bg, minHeight: "100vh", position: "relative" }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <button style={{ width: 38, height: 38, borderRadius: 999, background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Menu size={18} color={t.textPrimary} />
          </button>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 22, height: 22, borderRadius: 6, background: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: t.accent, fontFamily: F.display, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>M</span>
            </div>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 19, color: t.textPrimary }}>Marka</span>
          </div>
          <button style={{ width: 38, height: 38, borderRadius: 999, background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Bell size={17} color={t.textPrimary} />
            <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: t.accent, border: `1.5px solid ${t.surface}` }} />
          </button>
        </div>

        {/* Greeting + search */}
        <div className="px-4 pb-5">
          <h1 style={{ fontFamily: F.display, fontWeight: 600, fontSize: 26, color: t.textPrimary, lineHeight: 1.15 }}>
            Find your next<br />great trade.
          </h1>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search size={16} style={{ position: "absolute", left: 13, top: 13, color: t.textTertiary }} />
              <input
                placeholder="Search bikes, homes, phones…"
                style={{
                  width: "100%", padding: "12px 14px 12px 38px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.surface, fontSize: 14, color: t.textPrimary, outline: "none", fontFamily: F.body,
                }}
              />
            </div>
            <button style={{ width: 44, height: 44, borderRadius: 12, background: t.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none" }}>
              <SlidersHorizontal size={17} color="#fff" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: t.textPrimary, fontFamily: F.body }}>Categories</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.label} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <c.icon size={19} color={c.color} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: t.textPrimary }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promo banner */}
        <div className="px-4 mb-7">
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: `linear-gradient(120deg, ${t.primary}, #0D1730)` }}>
            <div className="pr-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: t.accent, fontFamily: F.mono }}>Sell faster</div>
              <div style={{ color: "#fff", fontFamily: F.display, fontWeight: 600, fontSize: 17, lineHeight: 1.25 }}>Boost your ad to<br/>the top of search</div>
            </div>
            <button style={{ width: 42, height: 42, borderRadius: 999, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none" }}>
              <ArrowRight size={18} color="#20140A" />
            </button>
          </div>
        </div>

        {/* Featured */}
        <div className="mb-7">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-sm font-semibold" style={{ color: t.textPrimary }}>Featured</h2>
            <div className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: t.secondary }}>Show all <ChevronRight size={13} /></div>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FEATURED.map((f) => <FeaturedCard key={f.id} item={f} fav={favs[f.id]} toggleFav={toggleFav} />)}
          </div>
        </div>

        {/* Latest ads */}
        <div className="px-4 pb-28">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: t.textPrimary }}>Latest ads</h2>
            <div className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: t.secondary }}>Show all <ChevronRight size={13} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LISTINGS.map((l) => <ListingCard key={l.id} item={l} fav={favs[l.id + 100]} toggleFav={(id) => toggleFav(id)} />)}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto" style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
          <div className="relative flex items-center justify-around py-2.5">
            {[
              { id: "home", label: "Home", icon: HomeIcon },
              { id: "favorites", label: "Favorites", icon: Heart },
            ].map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)} className="flex flex-col items-center gap-1" style={{ background: "none", border: "none" }}>
                <n.icon size={20} color={tab === n.id ? t.primary : t.textTertiary} fill={tab === n.id && n.id === "favorites" ? t.primary : "none"} />
                <span className="text-[10px] font-medium" style={{ color: tab === n.id ? t.primary : t.textTertiary }}>{n.label}</span>
              </button>
            ))}

            <button
              onClick={() => setTab("sell")}
              style={{
                width: 52, height: 52, borderRadius: 999, background: t.primary, display: "flex", alignItems: "center",
                justifyContent: "center", border: `4px solid ${t.bg}`, marginTop: -30, boxShadow: "0 6px 16px rgba(22,33,62,0.35)",
              }}
            >
              <Plus size={22} color={t.accent} />
            </button>

            {[
              { id: "search", label: "Search", icon: Search },
              { id: "profile", label: "Profile", icon: User },
            ].map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)} className="flex flex-col items-center gap-1" style={{ background: "none", border: "none" }}>
                <n.icon size={20} color={tab === n.id ? t.primary : t.textTertiary} />
                <span className="text-[10px] font-medium" style={{ color: tab === n.id ? t.primary : t.textTertiary }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
