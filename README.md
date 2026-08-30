# 🌴 Wayzyy — Host Growth & AI Booking Toolkit (Goa)

> **Goa Short-Term Rental AI & Revenue OS**  
> Empowering boutique villa & homestay hosts across Goa (Anjuna, Assagao, Vagator, Fontainhas, Palolem) with smart dynamic pricing algorithms, Claude AI listing optimization, and a 24/7 automated WhatsApp direct-booking concierge.

---

## ✨ Key Features

- **📊 Host Performance & Intelligence Dashboard**: Real-time revenue metrics, estimated occupancy rates, direct vs. OTA channel breakdown, and recent guest reservation feeds.
- **⚡ Smart Dynamic Pricing Engine**: Algorithmic rate calculator factoring Goa seasonality (peak, high, shoulder, monsoon), micro-location tiers (Premium, Mid, Budget), amenities multipliers (pool, sea view, AC, WiFi), weekend surges, and live market comparables.
- **✍️ AI Listing & Photo Staging Studio**: Generates high-converting Airbnb/Booking.com copy, catchy titles, sensory descriptions, and evaluates listing photos for lighting, cleanliness, and staging quality.
- **💬 WhatsApp AI Concierge Simulator**: Multi-turn 24/7 conversational booking assistant with real-time entity extraction (`dates`, `guests`, `property`), price quotation, and direct booking management (saving 15–20% in OTA commissions).
- **🏡 Property Manager & Booking Calendar**: Showcase active properties, filter reservations by status, and create new direct bookings or properties.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Vite, TypeScript, Custom Fluid Responsive Warm White Luxury CSS Design System.
- **Backend**: Node.js, Express, SQLite (`better-sqlite3` with WAL mode).
- **AI Engine**: Anthropic Claude 3.5 Sonnet (`@anthropic-ai/sdk`) with high-precision Goan domain heuristic fallback engine.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (optional, fallback engine active if not provided)
node db/seed.js   # Seed initial properties and demo bookings
node server.js    # Starts API on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev       # Starts UI on http://localhost:5173
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
     - `ANTHROPIC_API_KEY`: *(Optional - your Claude API key)*
4. Click **Deploy Web Service**. Render will give you a public URL (e.g. `https://wayzyy-backend.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel (Free)
1. Go to [vercel.com](https://vercel.com/new) and import your repository: `https://github.com/Akshay1267/wayzyy-host-toolkit`.
2. In the configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://your-backend-name.onrender.com/api` (use your Render URL from Step 1)
3. Click **Deploy**. Vercel will build and assign your live domain (e.g. `https://wayzyy-host-toolkit.vercel.app`).

---

```
wayzyy-host-toolkit/
├── backend/
│   ├── data/             # Goa market comparables and season data
│   ├── db/               # SQLite schema, connection, and seeder
│   ├── routes/           # Express REST endpoints
│   ├── services/         # Pricing engine, Claude AI client, WhatsApp bot engine
│   └── server.js         # API Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # Dashboard, Pricing, Listing, Bot, Properties
│   │   ├── api.ts        # Typed API client
│   │   ├── types.ts      # Data models
│   │   ├── style.css     # Design system
│   │   └── main.ts       # Router & app entry
│   └── index.html
└── README.md
```

---

## 📄 License
MIT License
