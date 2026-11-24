<p align="center">
  <img src="public/brand/logo.svg" alt="Aasan आसन Logo" width="320" />
</p>

# Aasan (आसन) — Immersive Ticketing & Seat-View Platform for Nepal

> **आसन • Aasan**: "Seat" in Nepali. Nepal's premier 3D seat-selection and digital ticketing platform featuring true eye-level perspective previews for stadiums and cinema halls.

---

## 🎨 Brand Identity (Option A: The Perspective Seat)
- **Symbol**: A geometric front-facing seat with a Nepal crimson backrest (`#dc143c`), white cushion base and armrests, and a dotted sightline ray leading to an elevated viewpoint dot—symbolizing "See your seat before you book."
- **Typography**: Geometric modern wordmark outlined from *Outfit Bold* paired with clean Devanagari *आसन* from *Noto Sans Devanagari*.
- **Color Palette**: Nepal Crimson (`#dc143c`), Off-White (`#ffffff`), and Deep Night (`#0a0b10`).
- **Assets**:
  - Dark Lockup: [`public/brand/logo.svg`](public/brand/logo.svg)
  - Light Lockup: [`public/brand/logo-light.svg`](public/brand/logo-light.svg)
  - Symbol: [`public/brand/symbol.svg`](public/brand/symbol.svg)
  - Favicon: [`public/favicon.svg`](public/favicon.svg)

---

## ⚠️ Demo Concept & Disclaimer
**DEMO CONCEPT ONLY.** All venue names, cinema chains, event details, movie titles, seating counts, layouts, prices, and showtimes are placeholder demo data.
- Not affiliated with, endorsed by, or partnered with Tribhuvan University Cricket Ground, QFX Cinemas, Civil Mall, CK Cinemas, FCube Cinemas, Big Movies, or any ticketing agency.
- All payment gateways (eSewa, Khalti, Fonepay, IME Pay) are **simulated mock interfaces**. No real personal data or payment credentials are taken or processed.
- Sponsor boards: demo placements (including partner branding like Blushbook).

---

## ✨ Features
1. **Interactive 3D Venue Overview**:
   - Dark luxury aesthetic with Nepal crimson (`#DC143C`) and deep blue (`#003893`) atmospheric glows.
   - Dynamic 3D top-down view of **QFX Cinemas (Civil Mall)**, **Tribhuvan University International Cricket Ground (Kirtipur)**, and multiple cinema halls.
   - Hover on any section to see real-time price (`from रू X`), seat availability, and tier info.
2. **Smooth 1.5s Fly-In Seat View**:
   - Camera smoothly transitions from overhead map into the exact eye-level perspective from that section.
   - Cinema: Orientated directly facing the curved screen with ambient auditorium illumination.
   - Stadium: Elevated view over the pitch center, wickets, and inner circle.
3. **Interactive Seat Picker & Sticky Cart**:
   - Distinct accessible states: Available, Selected, Sold out, and Wheelchair accessible (utilizing distinct iconography, not color alone).
   - Real-time seat tally (1 to 8 seat limit enforced).
   - Live total in NPR / रू.
4. **Mock Digital Wallet Checkout**:
   - Simulated payment flows for **eSewa**, **Khalti**, **Fonepay**, and **IME Pay**.
   - Interactive success and failure paths with processing states.
5. **Digital QR Ticket**:
   - High-fidelity dark pass card with booking reference (`ASN-XXXXXX`), verified QR code, seat breakdown, and print / save support.
   - Celebratory confetti on confirmation.
6. **Graceful Fallbacks & Dual-Language**:
   - **Lite Mode (2D)**: Interactive vector SVG map for low-end devices or environments without WebGL.
   - **Full Bilingual Support**: Instant toggle between English and Nepali (नेपाली) across all views and UI elements.

---

## 🛠️ Tech Stack
- **Build**: Vite + React 18 + TypeScript (strict)
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animation**: Framer Motion
- **State Management**: Zustand
- **QR Code**: `qrcode.react`
- **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 📁 Project Structure
```
src/
  ├── components/       # UI building blocks (Header, Footer, Badges)
  ├── features/
  │   ├── landing/      # Cinematic Hero with dual language & venue selectors
  │   ├── venue/        # 3D Cinema/Stadium map, 2D SVG fallback, VenueOverview
  │   ├── seats/        # Interactive seat grid, tier rules, sticky cart bar
  │   ├── checkout/     # Mock eSewa, Khalti, Fonepay, IME Pay wallets
  │   └── ticket/       # Digital pass card with QR code & download
  ├── data/             # venues.json, events.json, sold-seats.json (mock data)
  ├── i18n/             # en.json, ne.json, useT() hook
  ├── lib/              # money.ts (NPR formatting), device.ts (WebGL/low-end detection)
  ├── store/            # useBookingStore.ts
  └── types/            # TypeScript interfaces
```

---

## 📋 What is Simulated vs What is Next
| Feature | Status | Notes |
|---|---|---|
| 3D Stadium & Cinema Fly-in | ✅ Active | Real-time WebGL rendering with smooth lerped camera rig |
| 2D SVG Fallback & Lite Mode | ✅ Active | Automatically activates on low hardware or manual toggle |
| Language Switcher | ✅ Active | Complete English and Nepali translations |
| Seat Picking & Cart | ✅ Active | 1-8 seat rules, sold states, live pricing in NPR |
| Payment Gateways | 🧪 Simulated | Fake approval/failure tests for eSewa, Khalti, Fonepay, IME Pay |
| Real-time inventory | 🔮 Future | Requires backend WebSocket / database sync |
| Official venue partnership | 🔮 Future | Awaiting commercial agreements & stadium 3D scans |
