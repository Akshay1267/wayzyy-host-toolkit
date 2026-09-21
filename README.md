# 🏡 Wayzyy — Host Growth & AI Booking Toolkit

> **Short-Term Rental AI & Revenue Growth OS**  
> Empowering boutique villa, mountain chalet, heritage homestay, and vacation rental hosts worldwide with smart dynamic pricing algorithms, AI listing optimization, and a 24/7 automated WhatsApp direct-booking concierge.

---

## ✨ Key Features

- **💬 Live WhatsApp Direct-Booking Concierge**:
  - **End-to-End Hotel & Villa Bookings**: Guests can discover properties, check availability, get dynamic price quotes, and complete confirmed reservations directly on WhatsApp.
  - **Automatic Property Resolution**: Fuzzy-matches guest inquiries (e.g. *"Casa Azul"*, *"pool villa in Goa"*) to active database listings.
  - **Real-Time Calendar Availability**: Validates stay dates against existing reservations in SQLite to prevent double-bookings.
  - **Dynamic Rate Calculation**: Applies seasonality adjustments, weekend surges, and amenities multipliers in real-time.
  - **Instant Booking Creation & Receipts**: Writes confirmed reservations to the database (`source: 'whatsapp'`) and delivers rich WhatsApp receipts with interactive action buttons.
  - **Meta Cloud API Webhook**: Production-ready webhook verification and zero-splash-screen Cloudflare Tunneling.
- **📊 Host Intelligence & Performance Dashboard**: Real-time revenue metrics, occupancy rate analytics, direct vs. OTA channel breakdown, and live reservation feeds.
- **⚡ Smart Dynamic Pricing Studio**: Algorithmic rate calculator factoring destination demand, seasonality (peak holidays, high season, shoulder, monsoon), micro-location tiers, amenities multipliers, and live market comparables.
- **✍️ AI Listing & Photo Staging Studio**: Generates high-converting Airbnb/Booking.com copy, catchy headlines, sensory descriptions, SEO search tags, and evaluates listing photos for architectural lighting, cleanliness, and staging quality.
- **🏡 Property Manager & Booking Calendar**: Showcase active properties across diverse destinations, filter reservations by status, and create new direct bookings or listings.
- **🌓 Luxury UI with Light/Dark Mode**: Minimalist, circular one-click toggle between Warm White and Obsidian Dark luxury themes.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Vite, TypeScript, Custom Fluid Responsive Warm White / Obsidian Dark Luxury CSS Design System.
- **Backend**: Node.js, Express, SQLite (`better-sqlite3` with WAL mode).
- **AI Engine**: Google Gemini API (`gemini-3.6-flash`) & Anthropic Claude 3.5 Sonnet (`@anthropic-ai/sdk`), backed by a high-precision vacation rental domain heuristic fallback engine.
- **Messaging**: Meta WhatsApp Cloud API (`v26.0`) with interactive buttons, message templates, and Cloudflare Tunnel (`cloudflared`).

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm
- Cloudflare Tunnel (`cloudflared`) or OpenSSH (for exposing local webhooks to Meta)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Configure your environment in `backend/.env`:
```env
# Server Port
PORT=5000

# AI Configuration (Gemini or Claude)
GEMINI_API_KEY=your_gemini_api_key
# ANTHROPIC_API_KEY=your_claude_api_key (optional)

# WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_or_temp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_VERIFY_TOKEN=wayzyy_webhook_verify_2026
```

Seed the database and start the backend:
```bash
node db/seed.js   # Seed initial properties and demo bookings
npm start         # Starts API on http://localhost:5000
```

### 3. Expose WhatsApp Webhook to Meta
To receive incoming WhatsApp messages from guests on your local server:
```bash
cd backend
npm run tunnel
```
This launches a Cloudflare Tunnel and prints your **Callback URL**:
- **Callback URL**: `https://<your-subdomain>.trycloudflare.com/api/whatsapp/webhook`
- **Verify Token**: `wayzyy_webhook_verify_2026`

In the **Meta Developer Dashboard**:
1. Go to **WhatsApp** → **Configuration** → **Webhook**.
2. Paste the **Callback URL** and **Verify Token**, then click **Verify and Save**.
3. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev       # Starts UI on http://localhost:5173
```

---

## 📱 WhatsApp Booking Flow Example

1. **Guest texts**: *"Hi, I want to book Casa Azul for Oct 10-13 for 4 guests"*
2. **Bot replies**:
   ```text
   🏡 Casa Azul Pool Villa
   📍 Anjuna, Goa
   📅 Sat, 10 Oct → Tue, 13 Oct (3 nights)
   👥 4 guests
   💰 ₹13,800/night
   💵 Estimated Total: ₹41,400
   📊 Season: Peak Holiday / Festival Season (+35%)
   ✨ Direct booking saves you 15-20% compared to OTA platforms!

   Would you like to confirm this reservation?
   [Confirm Booking] [Explore Other Stays]
   ```
3. **Guest taps**: *[Confirm Booking]*
4. **Bot creates Booking in SQLite** and replies:
   ```text
   🎉 BOOKING CONFIRMED!
   📋 Booking #309
   🏡 Casa Azul Pool Villa — Anjuna, Goa
   📅 Check-in: Sat, 10 Oct, 2026
   📅 Check-out: Tue, 13 Oct, 2026
   🌙 3 Nights • 👥 4 Guests
   💰 ₹13,800/night • Total: ₹41,400
   ✅ Status: Confirmed
   📱 Booked via: WhatsApp Direct
   ```

---

## 🌐 1-Click Deployment Guide

### Step 1: Deploy Backend on Render (Free)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New + > Web Service**.
2. Connect your GitHub repository: `https://github.com/Akshay1267/wayzyy-host-toolkit`.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && node db/seed.js`
   - **Start Command**: `node server.js`
   - **Environment Variables**:
     - `PORT`: `5000`
     - `GEMINI_API_KEY`: *(Your Gemini API key)*
     - `WHATSAPP_ACCESS_TOKEN`: *(Your Meta access token)*
     - `WHATSAPP_PHONE_NUMBER_ID`: *(Your WhatsApp Phone Number ID)*
     - `WHATSAPP_BUSINESS_ACCOUNT_ID`: *(Your WABA ID)*
     - `WHATSAPP_VERIFY_TOKEN`: *(Your verification token)*
4. Set the Render service URL as your WhatsApp Webhook Callback URL in Meta Developer Dashboard (`https://your-service.onrender.com/api/whatsapp/webhook`).

---

### Step 2: Deploy Frontend on Vercel (Free)
1. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
2. In the configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://your-service.onrender.com/api`
3. Click **Deploy**.

---

## 📂 Project Structure

```
wayzyy-host-toolkit/
├── backend/
│   ├── data/             # Multi-destination market comparables and season data
│   ├── db/               # SQLite schema, connection, and seeder
│   ├── routes/           # Express REST endpoints (properties, pricing, listing, bot, whatsapp)
│   ├── services/         # Pricing engine, bookingUtils, botEngine, whatsappClient, aiClient
│   ├── tunnel.js         # Cloudflare Tunnel runner for local webhook testing
│   └── server.js         # API Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # Dashboard, Pricing, Listing, BotSimulator, Properties
│   │   ├── api.ts        # Typed API client
│   │   ├── types.ts      # TypeScript interfaces (Bookings, Properties, Pricing, Bot)
│   │   ├── style.css     # Luxury Warm White / Obsidian Dark design system
│   │   └── main.ts       # Router, circular theme toggle & app entry
│   └── index.html
└── README.md
```

---

## 📄 License
MIT License
