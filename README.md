<p align="center">
  <img src="public/brand/logo.svg" alt="Aasan आसन Logo" width="320" />
</p>

# Aasan (आसन) — Immersive Ticketing & Seat-View Platform for Nepal

> **आसन • Aasan**: "Seat" in Nepali. Nepal's premier 3D seat-selection and digital ticketing platform featuring true eye-level perspective previews for stadiums and cinema halls.

---

## 🎨 Brand Identity
- **Symbol**: A modern geometric front-facing seat with a Nepal crimson backrest (`#dc143c`), crisp white cushion base and armrests, and an upward sightline ray pointing to an elevated perspective dot—symbolizing *"See your seat before you book."*
- **Typography**: Geometric modern wordmark set in *Outfit Bold* paired with clean Devanagari *आसन* set in *Noto Sans Devanagari*.
- **Palette**: Nepal Crimson (`#dc143c`), Off-White (`#f8fafc`), and Deep Night (`#0a0b10`).
- **Brand Assets**:
  - Dark Header Lockup: [`public/brand/logo.svg`](public/brand/logo.svg)
  - Light Document Lockup: [`public/brand/logo-light.svg`](public/brand/logo-light.svg)
  - Standalone Symbol: [`public/brand/symbol.svg`](public/brand/symbol.svg)
  - Multi-resolution Favicons: [`public/favicon.svg`](public/favicon.svg), [`public/favicon-32x32.png`](public/favicon-32x32.png), [`public/apple-touch-icon.png`](public/apple-touch-icon.png)
  - OpenGraph Preview Card: [`public/og-image.png`](public/og-image.png)

---

## ⚠️ Demo Concept & Disclaimer
**DEMO CONCEPT ONLY.** All venue names, cinema chains, event details, movie titles, seating counts, layouts, prices, and showtimes are placeholder demo data.
- Not affiliated with, endorsed by, or partnered with Tribhuvan University Cricket Ground, Cricket Association of Nepal (CAN), QFX Cinemas, Civil Mall, CK Cinemas, FCube Cinemas, Big Movies, One Cinemas, or any ticketing agency.
- All payment gateways (**eSewa**, **Khalti**, **Fonepay**, **IME Pay**) are **simulated mock interfaces**. No real personal data or payment credentials are taken or processed.
- All digital tickets generated are marked **"DEMO — not valid for entry"**.

---

## ✨ Features
1. **Interactive 3D Venue Overview**:
   - Dynamic 3D models of **Tribhuvan University International Cricket Ground (Kirtipur)** and multiple **Cinema Auditoriums** (QFX, Big Movies, CK, FCube, etc.).
   - Day and Night mode toggles with realistic galvanized steel floodlight towers, pale glass lamp lenses, procedural turf variation, and drifting cumulus clouds.
   - Real-time hover preview displaying pricing (`from रू X`), seat availability, and tier breakdown.
2. **Smooth 1.5s Fly-In Seat Sightline**:
   - Smooth lerped camera rig swoops from aerial perspective down to the exact eye-level viewpoint of any selected seat.
   - Stadium: Elevated view directly over the pitch center, wickets, and inner circle.
   - Cinema: Accurate sightlines facing the curved silver screen with reactive ambient lighting wash.
3. **Interactive Seat Picker & Sticky Cart**:
   - Individual seat selection (enforced 1 to 8 seat booking limit).
   - High-contrast states for Available, Selected, Sold out, and Wheelchair accessible.
   - Multi-stand cart chips (`P1 · A1`, `East · A1`) with quick removal and price calculation in NPR (रू).
4. **Cinematic Hall Polish & Ambience Glow**:
   - Screen illumination reflecting dominant video colors across front rows, acoustic wall treatments, and floor carpeting.
   - Subtle, slow brightness variations (<5%, <1 Hz) respecting `prefers-reduced-motion` and Lite mode.
   - Best-available quick seat selector (1 to 8 contiguous seats in central rows).
5. **Simulated Payment Gateways & Timer Hold**:
   - 5-minute seat reservation countdown timer with warning state and automatic cart release upon expiry.
   - Realistic Nepali wallet modals for **eSewa**, **Khalti**, **Fonepay**, and **IME Pay** with test success and failure paths.
6. **Digital Pass & Multi-Seat Ticket Exports**:
   - Unwrapping-proof monospace Booking ID (`ASN-XXXXXX`) with one-click clipboard copy.
   - Dedicated QR code generated per booked seat in an interactive carousel grid.
   - High-fidelity **PDF Export** (vector A4 with embedded Devanagari font) and **PNG Pass Export** (1200px wide).
7. **Performance & Universal Accessibility**:
   - Initial gzipped bundle < 35 KB; code-split 3D scenes, checkout, and PDF generator.
   - Automatic 2D SVG Accessible Mode for low-end hardware or WebGL context recovery.
   - Full bilingual support (English and नेपाली) across all routes and dialogs.

---

## 🛠️ Tech Stack
- **Framework**: Vite + React 18 + TypeScript (strict)
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **State & Routing**: Zustand (atomic store + deep-link URL synchronization)
- **Animation**: Framer Motion & Canvas Confetti
- **Document Generation**: jsPDF (vector tickets) & qrcode.react
- **Testing**: Playwright (E2E) & Axe-Core (Automated WCAG 2.1 A/AA)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Available Scripts
- `npm run dev`: Starts local Vite development server with HMR.
- `npm run build`: Type-checks and creates an optimized production bundle in `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run test:e2e`: Executes Playwright end-to-end journey tests.
- `npm run test:perf`: Runs headless frame rate and draw-call benchmark script.
- `npm run test:a11y`: Executes automated Axe WCAG accessibility audit.

---

## 📁 Project Structure
```
Aasan/
├── public/
│   ├── brand/            # SVG logos, wordmarks, and app symbols
│   ├── images/           # Landing hero, feature cards, and venue previews (.webp, .avif, .jpg)
│   ├── favicon.svg       # Vector browser favicon
│   ├── favicon-32x32.png # Standard desktop favicon
│   ├── og-image.png      # 1200x630 social sharing card
│   ├── robots.txt        # Crawler index directives
│   ├── sitemap.xml       # Dynamic site map
│   └── site.webmanifest  # Progressive web app manifest
├── src/
│   ├── components/       # Header, Footer, LanguageToggle, Badges
│   ├── features/
│   │   ├── landing/      # Responsive landing page, hero, venue cards, feature highlights
│   │   ├── venue/        # StadiumMap3D, CinemaMap3D, AccessibleMap2D, VenueOverview
│   │   ├── seats/        # SeatPicker, SeatBookingBar, CartBar
│   │   ├── checkout/     # MockCheckout, BuyerDetailsForm, WalletModals
│   │   └── ticket/       # TicketView, TicketPDF, ticketGenerator.ts
│   ├── data/
│   │   ├── venues.json   # Stadium & cinema layouts, tiers, blocks, capacities
│   │   ├── events.json   # Matches, movies, showtimes, base pricing
│   │   └── sold-seats.json # Mock occupied seats across dates
│   ├── i18n/             # en.json, ne.json, useT() hook
│   ├── lib/              # money.ts (NPR formatting), urlRouting.ts, device.ts
│   ├── store/            # useBookingStore.ts (Zustand state engine)
│   └── types/            # TypeScript data contracts and interfaces
├── e2e/                  # Playwright end-to-end user journey tests
└── scripts/              # Performance, asset generation, and audit scripts
```

---

## ⚙️ Data Files & Customization

### 1. Modifying Venues (`src/data/venues.json`)
Each venue entry defines its geometry mode (`stadium` or `cinema`), total capacity, and sections/stands.
```json
{
  "id": "tu_cricket_ground",
  "name": "TU International Cricket Ground",
  "city": "Kirtipur, Kathmandu Valley",
  "type": "stadium",
  "sections": [
    {
      "id": "tu_pavilion_end",
      "name": "Grand Pavilion — Lower",
      "capacity": 1800,
      "tier": "VIP",
      "basePriceNPR": 1200
    }
  ]
}
```

### 2. Modifying Events & Showtimes (`src/data/events.json`)
Add matches or movie screenings, along with showtimes and dates:
```json
{
  "id": "event_tu_cricket_1",
  "venueId": "tu_cricket_ground",
  "title": "Nepal vs Netherlands — T20 Tri-Series Final",
  "titleNe": "नेपाल वि विरुद्ध नेदरल्यान्ड्स — टी-२० त्रिकोणीय श्रृंखला फाइनल",
  "date": "2026-11-28",
  "time": "13:15",
  "showtimes": ["01:15 PM"]
}
```

### 3. Modifying Sponsor Perimeter Boards
In `src/features/venue/StadiumMap3D.tsx`, the `SPONSORS` array controls stadium perimeter board signage:
```ts
const SPONSORS = ['Aasan आसन', 'eSewa', 'Khalti', 'Blushbook', 'Nepal Cricket'];
```

---

## 💳 Real Payment Gateway Integration Guide
To transition this demo into production, replace the simulated wallet modals in `src/features/checkout/MockCheckout.tsx` with verified gateway integrations:

1. **eSewa EPAY v2 Integration**:
   - Generate HMAC-SHA256 signature using `SecretKey`, `total_amount`, `transaction_uuid`, and `product_code`.
   - Submit form POST to `https://epay.esewa.com.np/api/epay/main/v2/form`.
   - Implement server webhook verification endpoint receiving `encoded_response` base64 payload.
2. **Khalti ePayment v2**:
   - Initiate payment via `POST https://a.khalti.com/api/v2/epayment/initiate/` with `Authorization: Key <secret_key>`, providing `return_url`, `website_url`, `amount`, and `purchase_order_id`.
   - Redirect buyer to returned `payment_url`.
   - Verify transaction state on return callback via `POST /api/v2/epayment/lookup/`.
3. **Fonepay Merchant Dynamic QR**:
   - Request dynamic QR string via Fonepay Merchant API with invoice number and exact NPR amount.
   - Render dynamic QR on checkout screen with polling WebSocket listener awaiting terminal credit notification.
4. **IME Pay Web Checkout**:
   - Call IME Pay Token Generation endpoint with merchant code and transaction ID.
   - Post to IME Pay checkout portal and handle asynchronous server-to-server IPN (Instant Payment Notification).
