import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Heart, Share2, MessageCircle, Star, MapPin, ChevronDown, ChevronRight,
  ChevronLeft, Menu, X, Home, LayoutGrid, PlusCircle, User, Bell, Settings,
  LayoutDashboard, BarChart3, Users, Tag as TagIcon, ShieldCheck, Sun, Moon, Check,
  AlertTriangle, Info, XCircle, Upload, SlidersHorizontal, Camera, TrendingUp,
  Package, DollarSign, MoreVertical, ArrowRight, Zap, Award, Clock, ChevronUp,
  Loader2, Bookmark, Eye, Filter, Grid3x3, List as ListIcon, Phone, Mail, Lock,
  CircleCheck, Palette, Type, Ruler, Layers, MousePointerClick, PanelsTopLeft,
  Boxes, ShoppingBag, LayoutTemplate, Gauge,
} from "lucide-react";

/* ============================================================================
   MARKA — Design System & Component Library
   A classifieds / marketplace product. Visual identity: "the ledger & the tag" —
   the trusted paper trail of a trade (ink, stamps, ticket stubs) rendered in a
   clean modern UI. Signature element: listing cards carry a die-cut "ticket
   stub" edge on the price corner, echoing a price tag torn from a paper ledger.
   ============================================================================ */

/* ---------------------------------- Fonts --------------------------------- */
function useFonts() {
  useEffect(() => {
    const id = "marka-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const F = {
  display: "'Fraunces', ui-serif, Georgia, serif",
  body: "'Inter', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

/* --------------------------------- Tokens --------------------------------- */
const light = {
  mode: "light",
  bg: "#F5F5F0",
  bgSunken: "#EEEDE5",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EFE8",
  border: "#E2E0D5",
  borderStrong: "#CBC8B9",
  textPrimary: "#161B2C",
  textSecondary: "#5B6070",
  textTertiary: "#8A8E9B",
  primary: "#16213E",
  primaryHover: "#0D1730",
  primarySoft: "#E7EAF2",
  secondary: "#2F5D62",
  secondaryHover: "#234749",
  secondarySoft: "#E4EEEE",
  accent: "#C6841F",
  accentHover: "#AD7015",
  accentSoft: "#F7E8CE",
  success: "#1F8A4C",
  successSoft: "#DFF3E6",
  warning: "#B9790F",
  warningSoft: "#FBEDD3",
  error: "#C13F3F",
  errorSoft: "#FBE4E2",
  overlay: "rgba(18,22,38,0.5)",
};

const dark = {
  mode: "dark",
  bg: "#0E1220",
  bgSunken: "#0A0D18",
  surface: "#161B2C",
  surfaceAlt: "#1C2338",
  border: "#2B3352",
  borderStrong: "#3B4468",
  textPrimary: "#EEF0F7",
  textSecondary: "#A4AABF",
  textTertiary: "#747C97",
  primary: "#7C90D6",
  primaryHover: "#95A7E1",
  primarySoft: "#20284A",
  secondary: "#5AA0A2",
  secondaryHover: "#71B2B4",
  secondarySoft: "#173232",
  accent: "#E0A94A",
  accentHover: "#EDBC66",
  accentSoft: "#3A2C15",
  success: "#3FBE79",
  successSoft: "#123326",
  warning: "#E7B451",
  warningSoft: "#3A2C10",
  error: "#E2685F",
  errorSoft: "#3A1918",
  overlay: "rgba(3,5,12,0.65)",
};

const SPACE = [
  { t: "space-1", px: 4 }, { t: "space-2", px: 8 }, { t: "space-3", px: 12 },
  { t: "space-4", px: 16 }, { t: "space-5", px: 20 }, { t: "space-6", px: 24 },
  { t: "space-8", px: 32 }, { t: "space-10", px: 40 }, { t: "space-12", px: 48 },
  { t: "space-16", px: 64 },
];
const RADII = [
  { t: "radius-sm", px: 6, use: "Inputs, tags, checkboxes" },
  { t: "radius-md", px: 10, use: "Buttons, small cards" },
  { t: "radius-lg", px: 16, use: "Listing cards, panels" },
  { t: "radius-xl", px: 22, use: "Modals, hero panels" },
  { t: "radius-full", px: 999, use: "Avatars, pills, badges" },
];

/* ------------------------------- Small utils ------------------------------- */
const withA = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

function Eyebrow({ children, t }) {
  return (
    <div
      className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest"
      style={{ color: t.accent, fontFamily: F.mono }}
    >
      <span style={{ width: 18, height: 1, background: t.accent, display: "inline-block" }} />
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, desc, t }) {
  return (
    <div className="mb-8 max-w-2xl">
      <Eyebrow t={t}>{eyebrow}</Eyebrow>
      <h2 className="text-3xl mb-3" style={{ fontFamily: F.display, fontWeight: 600, color: t.textPrimary }}>
        {title}
      </h2>
      {desc && <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>{desc}</p>}
    </div>
  );
}

function Panel({ t, children, style = {}, className = "" }) {
  return (
    <div
      className={"p-6 " + className}
      style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, ...style }}
    >
      {children}
    </div>
  );
}

function Kicker({ t, children }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: t.textTertiary, letterSpacing: "0.08em" }}>
      {children}
    </div>
  );
}

/* ----------------------------------- Button ----------------------------------- */
function Btn({ t, variant = "primary", size = "md", icon: Icon = null, iconRight = false, loading = false, disabled = false, children, full = false }) {
  const sizes = { sm: { py: 8, px: 14, fs: 13 }, md: { py: 11, px: 18, fs: 14 }, lg: { py: 14, px: 22, fs: 15 } };
  const s = sizes[size];
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: `${s.py}px ${s.px}px`, fontSize: s.fs, fontWeight: 600, borderRadius: 10,
    fontFamily: F.body, border: "1px solid transparent", cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .15s ease", width: full ? "100%" : "auto", opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  const variants = {
    primary: { background: t.primary, color: "#FFFFFF" },
    secondary: { background: t.secondary, color: "#FFFFFF" },
    accent: { background: t.accent, color: "#20140A" },
    outline: { background: "transparent", color: t.textPrimary, borderColor: t.borderStrong },
    ghost: { background: "transparent", color: t.textPrimary },
    danger: { background: t.error, color: "#FFFFFF" },
    success: { background: t.success, color: "#FFFFFF" },
  };
  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => { if (!disabled && !loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && !iconRight ? <Icon size={16} /> : null}
      {children}
      {!loading && Icon && iconRight ? <Icon size={16} /> : null}
    </button>
  );
}

function IconBtn({ t, icon: Icon, active = false, size = 38, filled = false }) {
  return (
    <button
      style={{
        width: size, height: size, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? (filled ? t.error : t.primarySoft) : t.surfaceAlt,
        color: active ? (filled ? "#fff" : t.primary) : t.textSecondary,
        border: `1px solid ${active ? "transparent" : t.border}`, cursor: "pointer", transition: "all .15s ease",
      }}
    >
      <Icon size={16} fill={active && filled ? "#fff" : "none"} />
    </button>
  );
}

/* ----------------------------------- Badges ----------------------------------- */
function Badge({ t, tone = "neutral", children, icon: Icon = null }) {
  const tones = {
    neutral: { bg: t.surfaceAlt, fg: t.textSecondary, bd: t.border },
    accent: { bg: t.accentSoft, fg: t.accent, bd: "transparent" },
    success: { bg: t.successSoft, fg: t.success, bd: "transparent" },
    warning: { bg: t.warningSoft, fg: t.warning, bd: "transparent" },
    error: { bg: t.errorSoft, fg: t.error, bd: "transparent" },
    primary: { bg: t.primarySoft, fg: t.primary, bd: "transparent" },
  };
  const c = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, padding: "4px 10px", borderRadius: 999, fontFamily: F.body }}
    >
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

function Tag({ t, children, onClose = false }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ background: t.surfaceAlt, color: t.textPrimary, border: `1px solid ${t.border}`, padding: "5px 10px", borderRadius: 8 }}
    >
      {children}
      {onClose && <X size={12} style={{ cursor: "pointer" }} />}
    </span>
  );
}

function Avatar({ t, initials, size = 40, ring = false }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700,
        fontFamily: F.display, boxShadow: ring ? `0 0 0 3px ${t.surface}, 0 0 0 4.5px ${t.accent}` : "none", flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function Stars({ t, value = 4.5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= Math.round(value) ? t.accent : "none"} color={i <= Math.round(value) ? t.accent : t.textTertiary} />
      ))}
    </div>
  );
}

/* ------------------------------- Ticket stub price ------------------------------ */
function PriceStub({ t, price, unit = null }) {
  // Signature element: a die-cut ticket-stub tag for price, perforated edge.
  return (
    <div className="relative inline-flex items-stretch" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" }}>
      <div
        className="flex flex-col items-start justify-center px-3 py-1.5"
        style={{ background: t.primary, color: "#fff", borderRadius: "8px 2px 2px 8px", position: "relative" }}
      >
        <span style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 600, lineHeight: 1 }}>{price}</span>
        {unit && <span style={{ fontSize: 9, opacity: 0.75, fontFamily: F.body }}>{unit}</span>}
        <span
          className="absolute"
          style={{
            right: -1, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%",
            background: t.bg, boxShadow: `inset 0 0 0 1px ${t.border}`,
          }}
        />
      </div>
    </div>
  );
}

/* =================================== SECTIONS =================================== */

function ColorsSection({ t, dark: isDark }) {
  const groups = [
    { name: "Primary", hex: t.primary, on: "#fff", desc: "Ink — headers, primary actions, nav" },
    { name: "Secondary", hex: t.secondary, on: "#fff", desc: "Ledger teal — secondary actions" },
    { name: "Accent", hex: t.accent, on: "#20140A", desc: "Brass — price tags, boosts, CTAs" },
    { name: "Success", hex: t.success, on: "#fff", desc: "Confirmations, verified sellers" },
    { name: "Warning", hex: t.warning, on: "#fff", desc: "Caution states, pending review" },
    { name: "Error", hex: t.error, on: "#fff", desc: "Destructive actions, failures" },
  ];
  const neutrals = [
    { name: "Background", hex: t.bg }, { name: "Surface", hex: t.surface },
    { name: "Surface Alt", hex: t.surfaceAlt }, { name: "Border", hex: t.border },
    { name: "Text Primary", hex: t.textPrimary }, { name: "Text Secondary", hex: t.textSecondary },
  ];
  return (
    <div>
      <SectionHeading t={t} eyebrow="01 · Foundations" title="Color palette"
        desc="Named 'the ledger & the tag' — deep ink for trust and structure, a warm brass for value and promotion, ledger teal for calm secondary actions. Every color carries a soft tint for badges and backgrounds." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {groups.map((c) => (
          <Panel t={t} key={c.name} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: c.hex, color: c.on, height: 84, display: "flex", alignItems: "flex-end", padding: 12 }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600 }}>{c.hex}</span>
            </div>
            <div className="p-3">
              <div className="font-semibold text-sm" style={{ color: t.textPrimary }}>{c.name}</div>
              <div className="text-xs mt-0.5" style={{ color: t.textSecondary }}>{c.desc}</div>
            </div>
          </Panel>
        ))}
      </div>
      <Kicker t={t}>Neutrals & surfaces ({isDark ? "dark theme" : "light theme"})</Kicker>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {neutrals.map((c) => (
          <div key={c.name} className="text-center">
            <div style={{ background: c.hex, height: 56, borderRadius: 10, border: `1px solid ${t.border}` }} />
            <div className="text-xs mt-2 font-medium" style={{ color: t.textPrimary }}>{c.name}</div>
            <div className="text-[11px]" style={{ color: t.textTertiary, fontFamily: F.mono }}>{c.hex}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographySection({ t }) {
  const heads = [
    { tag: "H1", size: 42, weight: 600, ff: F.display, text: "Find your next great trade" },
    { tag: "H2", size: 32, weight: 600, ff: F.display, text: "Featured listings near you" },
    { tag: "H3", size: 24, weight: 600, ff: F.display, text: "Vintage Leica M6, mint" },
    { tag: "H4", size: 19, weight: 600, ff: F.body, text: "Seller information" },
    { tag: "H5", size: 16, weight: 600, ff: F.body, text: "Shipping & pickup" },
    { tag: "H6", size: 13, weight: 700, ff: F.body, text: "RELATED CATEGORY" },
  ];
  return (
    <div>
      <SectionHeading t={t} eyebrow="01 · Foundations" title="Typography"
        desc="Fraunces (a warm, editorial serif) carries headings and prices with character; Inter handles UI and body copy for clarity at small sizes; IBM Plex Mono sets numerals — prices, timestamps, listing IDs — like ledger entries." />
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { name: "Fraunces", role: "Display — headings, hero copy, quotes", sample: "Aa", ff: F.display },
          { name: "Inter", role: "Body — UI text, labels, paragraphs", sample: "Aa", ff: F.body },
          { name: "IBM Plex Mono", role: "Data — prices, IDs, timestamps", sample: "Aa", ff: F.mono },
        ].map((f) => (
          <Panel t={t} key={f.name}>
            <div style={{ fontFamily: f.ff, fontSize: 44, color: t.textPrimary }}>{f.sample}</div>
            <div className="font-semibold text-sm mt-2" style={{ color: t.textPrimary }}>{f.name}</div>
            <div className="text-xs" style={{ color: t.textSecondary }}>{f.role}</div>
          </Panel>
        ))}
      </div>
      <Panel t={t} className="mb-6">
        {heads.map((h) => (
          <div key={h.tag} className="flex items-baseline gap-4 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className="text-xs w-8" style={{ color: t.textTertiary, fontFamily: F.mono }}>{h.tag}</span>
            <span style={{ fontFamily: h.ff, fontWeight: h.weight, fontSize: h.size, color: t.textPrimary, letterSpacing: h.tag === "H6" ? "0.08em" : "normal" }}>
              {h.text}
            </span>
          </div>
        ))}
      </Panel>
      <div className="grid md:grid-cols-2 gap-4">
        <Panel t={t}>
          <Kicker t={t}>Body & label</Kicker>
          <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: t.textPrimary }}>
            Body text (15px/1.7) — This mid-century apartment sits two blocks from the market square, with original oak floors and morning light.
          </p>
          <p className="mt-3 text-sm font-medium" style={{ color: t.textPrimary }}>Label (13px, 600) — Category</p>
          <p className="mt-2 text-xs" style={{ color: t.textTertiary }}>Caption (12px) — Posted 3 hours ago in Furniture</p>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Price & button text</Kicker>
          <div style={{ fontFamily: F.mono, fontSize: 30, fontWeight: 600, color: t.textPrimary }}>$1,240<span style={{ fontSize: 14, color: t.textSecondary }}> /mo</span></div>
          <div className="mt-4"><Btn t={t}>Button text — 14px, 600</Btn></div>
        </Panel>
      </div>
    </div>
  );
}

function SpacingSection({ t }) {
  return (
    <div>
      <SectionHeading t={t} eyebrow="01 · Foundations" title="Spacing, radius & elevation"
        desc="An 4px/8px scale keeps rhythm consistent from icon gaps to page sections. Radius grows with a component's visual weight; shadows stay soft and low-contrast, in step with the ink-on-paper identity." />
      <Kicker t={t}>Spacing scale</Kicker>
      <Panel t={t} className="mb-8">
        <div className="space-y-3">
          {SPACE.map((s) => (
            <div key={s.t} className="flex items-center gap-4">
              <span className="text-xs w-20" style={{ color: t.textTertiary, fontFamily: F.mono }}>{s.t}</span>
              <div style={{ height: 10, width: s.px * 2, background: t.accent, borderRadius: 3 }} />
              <span className="text-xs" style={{ color: t.textSecondary }}>{s.px}px</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Panel t={t}>
          <Kicker t={t}>Container widths</Kicker>
          {[["Mobile", "100%, 16px gutter"], ["Tablet", "720px"], ["Laptop", "1040px"], ["Desktop", "1200px"], ["Large screens", "1360px max"]].map((r) => (
            <div key={r[0]} className="flex justify-between text-sm py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span style={{ color: t.textPrimary }}>{r[0]}</span><span style={{ color: t.textSecondary, fontFamily: F.mono }}>{r[1]}</span>
            </div>
          ))}
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Section & card padding</Kicker>
          {[["Section (mobile)", "48px vertical"], ["Section (desktop)", "88px vertical"], ["Card padding", "20–24px"], ["Grid gutter", "16 / 24px"], ["Page margin (mobile)", "16px"]].map((r) => (
            <div key={r[0]} className="flex justify-between text-sm py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span style={{ color: t.textPrimary }}>{r[0]}</span><span style={{ color: t.textSecondary, fontFamily: F.mono }}>{r[1]}</span>
            </div>
          ))}
        </Panel>
      </div>
      <Kicker t={t}>Border radius</Kicker>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {RADII.map((r) => (
          <div key={r.t} className="text-center">
            <div style={{ height: 64, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: Math.min(r.px, 32) }} />
            <div className="text-xs mt-2 font-medium" style={{ color: t.textPrimary }}>{r.t}</div>
            <div className="text-[11px]" style={{ color: t.textTertiary }}>{r.use}</div>
          </div>
        ))}
      </div>
      <Kicker t={t}>Shadows</Kicker>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: "sm", sh: "0 1px 2px rgba(15,20,35,0.06)" },
          { name: "md", sh: "0 4px 10px rgba(15,20,35,0.08)" },
          { name: "lg", sh: "0 14px 28px rgba(15,20,35,0.12)" },
          { name: "hover", sh: "0 18px 34px rgba(15,20,35,0.16)" },
        ].map((s) => (
          <div key={s.name} className="text-center">
            <div style={{ height: 70, background: t.surface, borderRadius: 14, boxShadow: s.sh }} />
            <div className="text-xs mt-2 font-medium" style={{ color: t.textPrimary }}>shadow-{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonsSection({ t }) {
  return (
    <div>
      <SectionHeading t={t} eyebrow="02 · Actions" title="Buttons" desc="Seven variants covering every action weight, plus disabled and loading states." />
      <Panel t={t} className="mb-6">
        <Kicker t={t}>Variants</Kicker>
        <div className="flex flex-wrap gap-3">
          <Btn t={t} variant="primary" icon={PlusCircle}>Post a listing</Btn>
          <Btn t={t} variant="secondary">Message seller</Btn>
          <Btn t={t} variant="accent" icon={Zap}>Boost ad</Btn>
          <Btn t={t} variant="outline">View details</Btn>
          <Btn t={t} variant="ghost">Cancel</Btn>
          <Btn t={t} variant="danger">Delete listing</Btn>
          <Btn t={t} variant="success" icon={Check}>Mark as sold</Btn>
        </div>
      </Panel>
      <div className="grid md:grid-cols-3 gap-4">
        <Panel t={t}><Kicker t={t}>Sizes</Kicker><div className="flex flex-wrap items-center gap-3">
          <Btn t={t} size="sm">Small</Btn><Btn t={t} size="md">Medium</Btn><Btn t={t} size="lg">Large</Btn>
        </div></Panel>
        <Panel t={t}><Kicker t={t}>Disabled & loading</Kicker><div className="flex flex-wrap gap-3">
          <Btn t={t} disabled>Disabled</Btn><Btn t={t} loading>Saving</Btn>
        </div></Panel>
        <Panel t={t}><Kicker t={t}>Icon buttons</Kicker><div className="flex gap-3">
          <IconBtn t={t} icon={Heart} /><IconBtn t={t} icon={Heart} active filled /><IconBtn t={t} icon={Share2} /><IconBtn t={t} icon={MoreVertical} />
        </div></Panel>
      </div>
    </div>
  );
}

function FormsSection({ t }) {
  const [pw, setPw] = useState(false);
  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.border}`,
    background: t.surface, color: t.textPrimary, fontFamily: F.body, fontSize: 14, outline: "none",
  };
  const Label = ({ children }) => <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textPrimary }}>{children}</label>;
  return (
    <div>
      <SectionHeading t={t} eyebrow="02 · Actions" title="Forms" desc="Consistent 10px radius, single-pixel borders, and clear validation states across every input." />
      <div className="grid md:grid-cols-2 gap-6">
        <Panel t={t}>
          <Kicker t={t}>Text field & search</Kicker>
          <div className="mb-4"><Label>Listing title</Label><input style={inputStyle} placeholder="e.g. Trek mountain bike, 2022" /></div>
          <div className="mb-4">
            <Label>Search</Label>
            <div className="relative">
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: t.textTertiary }} />
              <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search bikes, furniture, jobs…" />
            </div>
          </div>
          <div className="mb-4">
            <Label>Password</Label>
            <div className="relative">
              <input type={pw ? "text" : "password"} style={{ ...inputStyle, paddingRight: 36 }} defaultValue="••••••••" />
              <Eye size={16} onClick={() => setPw(!pw)} style={{ position: "absolute", right: 12, top: 12, color: t.textTertiary, cursor: "pointer" }} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="Describe condition, size, reason for selling…" />
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Select, checkbox, radio, toggle</Kicker>
          <div className="mb-4">
            <Label>Category</Label>
            <div className="relative">
              <select style={{ ...inputStyle, appearance: "none" }}><option>Electronics</option><option>Furniture</option><option>Vehicles</option></select>
              <ChevronDown size={15} style={{ position: "absolute", right: 12, top: 12, color: t.textTertiary, pointerEvents: "none" }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 18, height: 18, borderRadius: 5, background: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} color="#fff" /></div>
            <span className="text-sm" style={{ color: t.textPrimary }}>Deliver locally</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${t.borderStrong}` }} />
            <span className="text-sm" style={{ color: t.textPrimary }}>Accept trade offers</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {["Fixed price", "Negotiable"].map((r, i) => (
              <div key={r} className="flex items-center gap-2">
                <div style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${i === 0 ? t.primary : t.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i === 0 && <div style={{ width: 9, height: 9, borderRadius: 999, background: t.primary }} />}
                </div>
                <span className="text-sm" style={{ color: t.textPrimary }}>{r}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: t.textPrimary }}>Show my phone number</span>
            <div style={{ width: 38, height: 22, borderRadius: 999, background: t.primary, padding: 2, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 18, height: 18, borderRadius: 999, background: "#fff" }} />
            </div>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Validation states</Kicker>
          <div className="mb-3">
            <Label>Email</Label>
            <input style={{ ...inputStyle, borderColor: t.success }} defaultValue="hana@inbox.com" />
            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: t.success }}><CircleCheck size={13} />Looks good</div>
          </div>
          <div>
            <Label>Price</Label>
            <input style={{ ...inputStyle, borderColor: t.error }} defaultValue="-20" />
            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: t.error }}><AlertTriangle size={13} />Enter a price of $0 or more</div>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>File upload</Kicker>
          <div className="flex flex-col items-center justify-center text-center py-8" style={{ border: `1.5px dashed ${t.borderStrong}`, borderRadius: 12, background: t.surfaceAlt }}>
            <Upload size={22} style={{ color: t.textTertiary }} />
            <div className="text-sm font-medium mt-2" style={{ color: t.textPrimary }}>Drop photos here or browse</div>
            <div className="text-xs mt-1" style={{ color: t.textTertiary }}>Up to 10 images · JPG, PNG</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CardsSection({ t }) {
  return (
    <div>
      <SectionHeading t={t} eyebrow="03 · Content" title="Cards" desc="One card language, six purposes." />
      <div className="grid md:grid-cols-3 gap-5">
        <Panel t={t} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: 120, background: `linear-gradient(135deg, ${t.secondary}, ${t.primary})` }} />
          <div className="p-4">
            <Kicker t={t}>Category card</Kicker>
            <div className="font-semibold" style={{ color: t.textPrimary, fontFamily: F.display, fontSize: 18 }}>Home & Garden</div>
            <div className="text-xs mt-1" style={{ color: t.textSecondary }}>2,481 listings</div>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>User profile card</Kicker>
          <div className="flex items-center gap-3">
            <Avatar t={t} initials="MR" ring />
            <div>
              <div className="font-semibold text-sm" style={{ color: t.textPrimary }}>Mara Reyes</div>
              <div className="flex items-center gap-1 text-xs" style={{ color: t.textSecondary }}><Stars t={t} value={4.8} size={11} />4.8 (112)</div>
            </div>
          </div>
          <div className="mt-3 text-xs" style={{ color: t.textTertiary }}>Member since 2021 · Usually replies in 1 hour</div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Statistics card</Kicker>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 26, fontWeight: 600, color: t.textPrimary }}>1,204</div>
              <div className="text-xs" style={{ color: t.textSecondary }}>Total views this week</div>
            </div>
            <div style={{ background: t.successSoft, color: t.success, padding: 8, borderRadius: 10 }}><TrendingUp size={18} /></div>
          </div>
        </Panel>
        <Panel t={t} style={{ padding: 0, overflow: "hidden" }} className="md:col-span-2">
          <div className="flex">
            <div style={{ width: 140, background: t.surfaceAlt, flexShrink: 0 }} />
            <div className="p-4">
              <Kicker t={t}>Blog post card</Kicker>
              <div className="font-semibold" style={{ color: t.textPrimary, fontFamily: F.display, fontSize: 17 }}>Five tips for photographing a listing that sells</div>
              <div className="text-xs mt-2" style={{ color: t.textTertiary }}>Selling guide · 4 min read</div>
            </div>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Pricing plan card</Kicker>
          <div className="flex items-baseline gap-1"><span style={{ fontFamily: F.mono, fontSize: 26, fontWeight: 600, color: t.textPrimary }}>$9</span><span className="text-xs" style={{ color: t.textSecondary }}>/ 7 days</span></div>
          <div className="text-sm font-medium mt-1 mb-3" style={{ color: t.textPrimary }}>Featured Boost</div>
          {["Top of category", "Highlighted card", "3x more views"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs mb-1.5" style={{ color: t.textSecondary }}><Check size={13} color={t.success} />{f}</div>
          ))}
          <div className="mt-3"><Btn t={t} variant="accent" full>Choose plan</Btn></div>
        </Panel>
      </div>
    </div>
  );
}

function NavigationSection({ t }) {
  const items = [
    { icon: Home, label: "Home" }, { icon: LayoutGrid, label: "Categories" },
    { icon: PlusCircle, label: "Sell" }, { icon: MessageCircle, label: "Inbox" }, { icon: User, label: "Profile" },
  ];
  return (
    <div>
      <SectionHeading t={t} eyebrow="04 · Structure" title="Navigation" desc="Desktop header, mobile bottom bar, admin sidebar, and breadcrumbs — all sharing the same active-state language." />
      <Kicker t={t}>Desktop navigation</Kicker>
      <Panel t={t} style={{ padding: "12px 20px" }} className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 30, height: 30, borderRadius: 8, background: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TagIcon size={15} color="#fff" />
            </div>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: t.textPrimary }}>Marka</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {["Home", "Categories", "Blog", "Contact"].map((l, i) => (
              <span key={l} style={{ color: i === 0 ? t.primary : t.textSecondary, borderBottom: i === 0 ? `2px solid ${t.accent}` : "2px solid transparent", paddingBottom: 4 }}>{l}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <IconBtn t={t} icon={Bell} />
            <Btn t={t} size="sm" icon={PlusCircle}>Post ad</Btn>
            <Avatar t={t} initials="JD" size={32} />
          </div>
        </div>
      </Panel>
      <Kicker t={t}>Mobile bottom navigation</Kicker>
      <Panel t={t} style={{ padding: "8px 12px", maxWidth: 380 }} className="mb-6">
        <div className="flex justify-between">
          {items.map((it, i) => (
            <div key={it.label} className="flex flex-col items-center gap-1 px-2 py-1">
              <it.icon size={20} color={i === 0 ? t.primary : t.textTertiary} />
              <span className="text-[10px] font-medium" style={{ color: i === 0 ? t.primary : t.textTertiary }}>{it.label}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Kicker t={t}>Admin sidebar</Kicker>
          <Panel t={t} style={{ padding: 12, background: t.primary, maxWidth: 220 }}>
            {[{ i: LayoutDashboard, l: "Overview", a: true }, { i: Package, l: "Listings" }, { i: Users, l: "Users" }, { i: TagIcon, l: "Promotions" }, { i: BarChart3, l: "Analytics" }, { i: Settings, l: "Settings" }].map((it) => (
              <div key={it.l} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-1"
                style={{ background: it.a ? withA("#ffffff", 0.14) : "transparent", color: it.a ? "#fff" : withA("#ffffff", 0.65) }}>
                <it.i size={16} />{it.l}
              </div>
            ))}
          </Panel>
        </div>
        <div>
          <Kicker t={t}>Breadcrumbs</Kicker>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: t.textSecondary }}>
            <span>Home</span><ChevronRight size={13} /><span>Electronics</span><ChevronRight size={13} /><span style={{ color: t.textPrimary, fontWeight: 600 }}>Cameras</span>
          </div>
          <div className="mt-6">
            <Kicker t={t}>Pagination</Kicker>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={15} color={t.textSecondary} /></div>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ width: 32, height: 32, borderRadius: 8, background: n === 1 ? t.primary : "transparent", border: n === 1 ? "none" : `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: n === 1 ? "#fff" : t.textSecondary, fontSize: 13, fontWeight: 600 }}>{n}</div>
              ))}
              <span className="text-sm" style={{ color: t.textTertiary }}>…</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={15} color={t.textSecondary} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentsSection({ t }) {
  const [tab, setTab] = useState(0);
  const [acc, setAcc] = useState(0);
  return (
    <div>
      <SectionHeading t={t} eyebrow="05 · Patterns" title="Core UI components" desc="Tabs, accordion, alerts, toasts, skeletons, tooltips and more — the everyday building blocks." />
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Panel t={t}>
          <Kicker t={t}>Tabs</Kicker>
          <div className="flex gap-1 p-1 mb-3" style={{ background: t.surfaceAlt, borderRadius: 10, width: "fit-content" }}>
            {["Details", "Seller", "Reviews"].map((l, i) => (
              <div key={l} onClick={() => setTab(i)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === i ? t.surface : "transparent", color: tab === i ? t.textPrimary : t.textSecondary, boxShadow: tab === i ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{l}</div>
            ))}
          </div>
          <p className="text-sm" style={{ color: t.textSecondary }}>{["Condition: like new. No scratches, includes original case.", "Responds within the hour. 112 completed trades.", "\u201CSmooth handoff, item exactly as described.\u201D"][tab]}</p>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Accordion</Kicker>
          {["Shipping options", "Return policy"].map((q, i) => (
            <div key={q} style={{ borderBottom: i === 0 ? `1px solid ${t.border}` : "none" }}>
              <div onClick={() => setAcc(acc === i ? -1 : i)} className="flex items-center justify-between py-2.5 cursor-pointer">
                <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{q}</span>
                <ChevronDown size={15} style={{ color: t.textSecondary, transform: acc === i ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              </div>
              {acc === i && <p className="text-xs pb-3" style={{ color: t.textSecondary }}>Local pickup preferred; seller may also ship at buyer's cost.</p>}
            </div>
          ))}
        </Panel>
      </div>
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Panel t={t}>
          <Kicker t={t}>Alerts</Kicker>
          <div className="space-y-2">
            {[{ i: Info, tone: "primary", m: "Your listing is pending review." }, { i: CircleCheck, tone: "success", m: "Listing published successfully." }, { i: AlertTriangle, tone: "warning", m: "Add at least one photo to publish." }, { i: XCircle, tone: "error", m: "Payment could not be processed." }].map((a) => (
              <div key={a.m} className="flex items-center gap-2 text-xs p-2.5 rounded-lg" style={{ background: t[a.tone + "Soft"] || t.primarySoft, color: t[a.tone] || t.primary }}>
                <a.i size={14} />{a.m}
              </div>
            ))}
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Toast notification</Kicker>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: t.textPrimary, color: t.bg, maxWidth: 300 }}>
            <div style={{ background: t.success, borderRadius: 999, padding: 5 }}><Check size={13} color="#fff" /></div>
            <div>
              <div className="text-sm font-semibold">Message sent</div>
              <div className="text-xs opacity-70">Mara will be notified instantly</div>
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <Panel t={t}>
          <Kicker t={t}>Skeleton loader</Kicker>
          <div className="space-y-2">
            <div style={{ height: 90, borderRadius: 10, background: t.surfaceAlt }} />
            <div style={{ height: 12, width: "70%", borderRadius: 6, background: t.surfaceAlt }} />
            <div style={{ height: 12, width: "40%", borderRadius: 6, background: t.surfaceAlt }} />
          </div>
        </Panel>
        <Panel t={t} className="flex flex-col items-center justify-center">
          <Kicker t={t}>Spinner</Kicker>
          <Loader2 size={26} className="animate-spin" color={t.primary} />
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Empty state</Kicker>
          <div className="text-center py-3">
            <Bookmark size={22} style={{ color: t.textTertiary, margin: "0 auto" }} />
            <div className="text-sm font-semibold mt-2" style={{ color: t.textPrimary }}>No saved listings yet</div>
            <div className="text-xs mt-1" style={{ color: t.textTertiary }}>Tap the heart on any listing to save it here.</div>
          </div>
        </Panel>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <Panel t={t}>
          <Kicker t={t}>Tags & filters</Kicker>
          <div className="flex flex-wrap gap-2"><Tag t={t} onClose>Under $500</Tag><Tag t={t} onClose>Local pickup</Tag><Tag t={t}>+ Add filter</Tag></div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Tooltip</Kicker>
          <div className="relative inline-block mt-2">
            <IconBtn t={t} icon={Info} />
            <div className="absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-1 rounded text-[11px] whitespace-nowrap" style={{ background: t.textPrimary, color: t.bg }}>Verified sellers only</div>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Dropdown menu</Kicker>
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
            {["Edit listing", "Boost ad", "Delete"].map((m, i) => (
              <div key={m} className="text-xs px-3 py-2" style={{ color: i === 2 ? t.error : t.textPrimary, borderBottom: i < 2 ? `1px solid ${t.border}` : "none" }}>{m}</div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MarketplaceSection({ t }) {
  return (
    <div>
      <SectionHeading t={t} eyebrow="06 · Marketplace" title="Marketplace components" desc="The domain-specific pieces every listing, seller, and search page is built from — anchored by the ticket-stub price tag." />
      {/* Listing card */}
      <Kicker t={t}>Listing card</Kicker>
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[{ title: "Trek Marlin 7, 2022", price: "$540", cat: "Bicycles", boosted: true }, { title: "Mid-century oak desk", price: "$220", cat: "Furniture", featured: true }, { title: "Leica M6 35mm, mint", price: "$1,890", cat: "Cameras" }].map((l) => (
          <Panel t={t} key={l.title} style={{ padding: 0, overflow: "hidden" }} className="relative">
            <div style={{ height: 140, background: t.surfaceAlt, position: "relative" }}>
              {l.boosted && <div className="absolute top-2 left-2"><Badge t={t} tone="accent" icon={Zap}>Boosted</Badge></div>}
              {l.featured && <div className="absolute top-2 left-2"><Badge t={t} tone="primary" icon={Award}>Featured</Badge></div>}
              <div className="absolute top-2 right-2"><IconBtn t={t} icon={Heart} size={32} /></div>
            </div>
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm leading-snug" style={{ color: t.textPrimary }}>{l.title}</div>
              </div>
              <div className="flex items-center gap-1 text-xs mt-1" style={{ color: t.textTertiary }}><MapPin size={11} />2.4 mi · {l.cat}</div>
              <div className="flex items-center justify-between mt-3">
                <PriceStub t={t} price={l.price} />
                <span className="text-[11px]" style={{ color: t.textTertiary, fontFamily: F.mono }}>2h ago</span>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <div>
          <Kicker t={t}>Seller profile card</Kicker>
          <Panel t={t}>
            <div className="flex items-center gap-3">
              <Avatar t={t} initials="MR" ring size={48} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-sm" style={{ color: t.textPrimary }}>Mara Reyes <ShieldCheck size={14} color={t.success} /></div>
                <div className="flex items-center gap-1 text-xs" style={{ color: t.textSecondary }}><Stars t={t} value={4.8} size={11} /><span>4.8 · 112 sales</span></div>
              </div>
              <Badge t={t} tone="success">Verified</Badge>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn t={t} variant="primary" size="sm" icon={MessageCircle} full>Contact seller</Btn>
              <Btn t={t} variant="outline" size="sm" icon={Share2} />
            </div>
          </Panel>
        </div>
        <div>
          <Kicker t={t}>Reviews</Kicker>
          <Panel t={t}>
            <div className="flex items-start gap-3">
              <Avatar t={t} initials="TK" size={36} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>Tomás K.</span>
                  <Stars t={t} value={5} size={12} />
                </div>
                <p className="text-xs mt-1" style={{ color: t.textSecondary }}>Great communication, item as described, would trade again.</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <div>
          <Kicker t={t}>Product gallery + price section</Kicker>
          <Panel t={t}>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div style={{ gridColumn: "span 4", height: 150, background: t.surfaceAlt, borderRadius: 10 }} />
              {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 40, background: t.surfaceAlt, borderRadius: 6, border: i === 1 ? `2px solid ${t.accent}` : `1px solid ${t.border}` }} />)}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 600, color: t.textPrimary }}>$1,890</div>
                <div className="text-xs" style={{ color: t.textTertiary }}>Firm price</div>
              </div>
              <Btn t={t} icon={MessageCircle}>Contact seller</Btn>
            </div>
          </Panel>
        </div>
        <div>
          <Kicker t={t}>Chat preview & map/location</Kicker>
          <Panel t={t} className="mb-3">
            <div className="flex items-center gap-3">
              <Avatar t={t} initials="LS" size={36} />
              <div className="flex-1">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold" style={{ color: t.textPrimary }}>Liam S.</span><span className="text-[11px]" style={{ color: t.textTertiary }}>9:41</span></div>
                <div className="text-xs" style={{ color: t.textSecondary }}>Is this still available? Can do $500 today.</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: t.accent }} />
            </div>
          </Panel>
          <Panel t={t} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 90, background: t.surfaceAlt, position: "relative" }}>
              <MapPin size={20} color={t.error} style={{ position: "absolute", top: "40%", left: "48%" }} />
            </div>
            <div className="p-3 flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}><MapPin size={12} />Riverside District · 2.4 mi away</div>
          </Panel>
        </div>
      </div>

      <Kicker t={t}>Search filters bar</Kicker>
      <Panel t={t} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: t.textPrimary }}><SlidersHorizontal size={14} />Filters</div>
        <Tag t={t}>Category: Electronics</Tag><Tag t={t}>$0 – $500</Tag><Tag t={t}>Within 5 mi</Tag>
        <span className="text-xs ml-auto" style={{ color: t.textTertiary }}>1,204 results</span>
      </Panel>
    </div>
  );
}

function DashboardSection({ t }) {
  const stats = [
    { l: "Active listings", v: "18", i: Package, tone: "primary" },
    { l: "Total views", v: "12.4k", i: Eye, tone: "secondary" },
    { l: "Messages", v: "34", i: MessageCircle, tone: "accent" },
    { l: "Revenue", v: "$2,140", i: DollarSign, tone: "success" },
  ];
  const rows = [
    { name: "Trek Marlin 7", status: "Active", views: 340, price: "$540" },
    { name: "Oak writing desk", status: "Pending", views: 88, price: "$220" },
    { name: "Leica M6 35mm", status: "Sold", views: 902, price: "$1,890" },
  ];
  const statusTone = { Active: "success", Pending: "warning", Sold: "neutral" };
  return (
    <div>
      <SectionHeading t={t} eyebrow="07 · Dashboards" title="Dashboard components" desc="Shared by the seller dashboard and admin panel: stat cards, data tables, chart placeholders, and management cards." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Panel t={t} key={s.l}>
            <div style={{ background: t[s.tone + "Soft"], color: t[s.tone], width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><s.i size={16} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 600, color: t.textPrimary }} className="mt-3">{s.v}</div>
            <div className="text-xs" style={{ color: t.textSecondary }}>{s.l}</div>
          </Panel>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <Panel t={t} className="md:col-span-2">
          <Kicker t={t}>Listing management — data table</Kicker>
          <div className="text-xs" style={{ color: t.textTertiary }}>
            <div className="grid grid-cols-4 gap-2 pb-2 font-semibold" style={{ borderBottom: `1px solid ${t.border}`, color: t.textSecondary }}>
              <span>Listing</span><span>Status</span><span>Views</span><span>Price</span>
            </div>
            {rows.map((r) => (
              <div key={r.name} className="grid grid-cols-4 gap-2 py-2.5 items-center" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span className="font-medium" style={{ color: t.textPrimary }}>{r.name}</span>
                <span><Badge t={t} tone={statusTone[r.status]}>{r.status}</Badge></span>
                <span style={{ fontFamily: F.mono }}>{r.views}</span>
                <span style={{ fontFamily: F.mono, color: t.textPrimary }}>{r.price}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Chart placeholder</Kicker>
          <div className="flex items-end gap-1.5" style={{ height: 100 }}>
            {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? t.accent : t.primarySoft, borderRadius: 3 }} />
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: t.textTertiary }}>Views, last 7 days</div>
        </Panel>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Panel t={t}>
          <Kicker t={t}>User management card</Kicker>
          <div className="flex items-center gap-3">
            <Avatar t={t} initials="JD" size={38} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: t.textPrimary }}>Jordan Diaz</div>
              <div className="text-xs" style={{ color: t.textTertiary }}>jordan@inbox.com · Joined Mar 2024</div>
            </div>
            <Badge t={t} tone="success">Active</Badge>
          </div>
        </Panel>
        <Panel t={t}>
          <Kicker t={t}>Promotion management card</Kicker>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: t.textPrimary }}>Featured Boost — Leica M6</div>
              <div className="text-xs" style={{ color: t.textTertiary }}>Ends in 3 days</div>
            </div>
            <Badge t={t} tone="accent" icon={Zap}>Live</Badge>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =================================== APP SHELL =================================== */

const NAV = [
  { id: "colors", label: "Colors", icon: Palette },
  { id: "type", label: "Typography", icon: Type },
  { id: "space", label: "Spacing & Shadow", icon: Ruler },
  { id: "buttons", label: "Buttons", icon: MousePointerClick },
  { id: "forms", label: "Forms", icon: LayoutTemplate },
  { id: "cards", label: "Cards", icon: Layers },
  { id: "nav", label: "Navigation", icon: PanelsTopLeft },
  { id: "components", label: "Components", icon: Boxes },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { id: "dashboard", label: "Dashboard", icon: Gauge },
];

export default function App() {
  useFonts();
  const [isDark, setIsDark] = useState(false);
  const [active, setActive] = useState("colors");
  const [mobileNav, setMobileNav] = useState(false);
  const t = useMemo(() => (isDark ? dark : light), [isDark]);

  const renderSection = () => {
    switch (active) {
      case "colors": return <ColorsSection t={t} dark={isDark} />;
      case "type": return <TypographySection t={t} />;
      case "space": return <SpacingSection t={t} />;
      case "buttons": return <ButtonsSection t={t} />;
      case "forms": return <FormsSection t={t} />;
      case "cards": return <CardsSection t={t} />;
      case "nav": return <NavigationSection t={t} />;
      case "components": return <ComponentsSection t={t} />;
      case "marketplace": return <MarketplaceSection t={t} />;
      case "dashboard": return <DashboardSection t={t} />;
      default: return null;
    }
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: F.body, color: t.textPrimary, transition: "background .2s ease" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: withA(t.bg, 0.85), backdropFilter: "blur(8px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)}><Menu size={22} color={t.textPrimary} /></button>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TagIcon size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17, lineHeight: 1 }}>Marka</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: t.textTertiary, fontFamily: F.mono }}>Design system</div>
            </div>
          </div>
          <button onClick={() => setIsDark(!isDark)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: t.surfaceAlt, border: `1px solid ${t.border}`, fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />} {isDark ? "Light" : "Dark"}
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden px-4 pb-3 grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <div key={n.id} onClick={() => { setActive(n.id); setMobileNav(false); }}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: active === n.id ? t.primary : t.surfaceAlt, color: active === n.id ? "#fff" : t.textSecondary }}>
                <n.icon size={14} />{n.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-8 py-8">
        {/* Sidebar */}
        <div className="hidden md:block" style={{ width: 220, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 84 }}>
            {NAV.map((n) => (
              <div key={n.id} onClick={() => setActive(n.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 cursor-pointer"
                style={{ background: active === n.id ? t.primarySoft : "transparent", color: active === n.id ? t.primary : t.textSecondary }}>
                <n.icon size={16} />{n.label}
              </div>
            ))}
            <div className="mt-6 p-4 rounded-xl" style={{ background: t.primary, color: "#fff" }}>
              <div className="text-xs font-semibold mb-1" style={{ fontFamily: F.mono }}>PAGES SUPPORTED</div>
              <p className="text-xs opacity-80 leading-relaxed">Home, Search, Listing Details, Add/Edit Listing, Profile, Messaging, Admin & Seller Dashboards, Checkout and more — all built from these tokens.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-24 md:pb-8">{renderSection()}</div>
      </div>

      {/* Mobile bottom nav (functional, demonstrates pattern + real navigation) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2" style={{ background: t.surface, borderTop: `1px solid ${t.border}`, zIndex: 30 }}>
        {[NAV[8], NAV[7], NAV[0], NAV[9]].map((n) => (
          <div key={n.id} onClick={() => setActive(n.id)} className="flex flex-col items-center gap-0.5 px-2">
            <n.icon size={19} color={active === n.id ? t.primary : t.textTertiary} />
            <span className="text-[10px] font-medium" style={{ color: active === n.id ? t.primary : t.textTertiary }}>{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
