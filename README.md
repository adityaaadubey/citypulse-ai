# 🏙️ CityPulse AI
> **Smart City Exploration & Situational Intelligence Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-Gemini%203.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20&%20RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://city-five-chi.vercel.app)

---

## 🌐 Live Production Deployment

- **Live URL**: [https://city-five-chi.vercel.app](https://city-five-chi.vercel.app)
- **Deployment Preview**: [https://city-b0pxb5xhp-adityaomprakashdubey-3717.vercel.app](https://city-b0pxb5xhp-adityaomprakashdubey-3717.vercel.app)
- **GitHub Repository**: [https://github.com/adityaaadubey/citypulse-ai](https://github.com/adityaaadubey/citypulse-ai)

---

## ✨ Overview

**CityPulse AI** is a situational intelligence platform for city exploration. It bridges live public spatial data with ground-level community observations, providing travelers and citizens with actionable, transparent recommendations.

### 🌟 Core Capabilities

1. **Interactive Geospatial Map (`Leaflet.js`)**: Dynamic viewport centering, custom markers for Food, Attractions, Heritage, Hotels, Budget spots, and Citizen safety reports.
2. **Worldwide Geocoding (`Nominatim`)**: Instant city and neighborhood search with automated bounding box detection.
3. **Live POI Discovery (`Overpass API`)**: Queries OpenStreetMap nodes dynamically with intelligent rate limiting, in-memory caching, and transparent source labeling.
4. **Coordinate-based Weather (`Open-Meteo`)**: Real-time atmospheric conditions, wind speed, and temperature.
5. **Google Gemini-Powered AI Assistant (`@google/genai`)**:
   - Generates weather-aware itineraries, budget exploration routes, and location comparisons.
   - **Strict Grounding**: Recommendations reference verified place IDs only; never fabricates reviews, prices, or crime stats.
   - **Code-Calculated Metrics**: Haversine distance calculations and report aggregations are computed in server-side TypeScript code and fed to the model.
   - **Deterministic Fallback**: Automatically provides a rule-based plan if the Gemini API is unavailable or rate-limited.
6. **Community Incident Reporting (`Supabase`)**:
   - Report waterlogging, poor lighting, accidents, safety concerns, and obstructions.
   - Persists to Supabase PostgreSQL table (`citizen_reports`) with Row Level Security (RLS).
   - Features local-first offline fallback if cloud credentials are not yet configured.
7. **Women's Safety & Timing Aid**: Heuristic trip planning warnings based on time of day, lighting reports, and neighborhood transit density.

---

## 🏗️ Architecture

```
citypulse-ai/
├── app/
│   ├── api/
│   │   ├── assistant/route.ts  # Gemini AI Assistant with server-only key protection & fallback
│   │   ├── places/route.ts     # OpenStreetMap Overpass POI retrieval with caching
│   │   ├── reports/route.ts    # Supabase CRUD for citizen reports with offline fallback
│   │   ├── search/route.ts     # Nominatim geocoding & multi-city search
│   │   └── weather/route.ts    # Open-Meteo live weather data by coordinates
│   ├── globals.css             # Tailwind CSS tokens
│   ├── layout.tsx              # Root Next.js layout & metadata
│   └── page.tsx                # Renders the live dashboard
├── components/
│   ├── CityMap.tsx             # Interactive Leaflet map with custom icons & layers
│   └── LiveCityPulseDashboard.tsx # Responsive map-first application interface
├── lib/
│   ├── data.ts                 # Seed landmarks, demo reports & Haversine distance math
│   ├── supabase.ts             # Supabase client, row mappers & connection status
│   ├── types.ts                # Domain models (Place, CitizenReport, AssistantResponse)
│   └── server/
│       ├── assistant.ts        # Gemini SDK client, prompt constraints & numeric calculations
│       ├── cache.ts            # Rate limiting & memory cache for external APIs
│       └── overpass.ts         # Overpass QL query builder
├── supabase/
│   └── schema.sql              # PostgreSQL DDL, RLS policies, indexes & seed data
├── scripts/
│   └── test-assistant-suite.ts # Automated test suite (normal, missing, malformed, failure)
└── .env.example                # Environment variables reference
```

---

## 🗄️ Supabase Setup Guide

1. Log in to [Supabase](https://supabase.com/) and create a project.
2. Navigate to the **SQL Editor** (`/dashboard/project/_/sql`).
3. Run the complete schema script from [`supabase/schema.sql`](supabase/schema.sql):
   ```sql
   -- Creates citizen_reports table with RLS and spatial indexes
   CREATE TABLE IF NOT EXISTS public.citizen_reports (
       id TEXT PRIMARY KEY,
       category TEXT NOT NULL,
       title TEXT NOT NULL,
       detail TEXT NOT NULL,
       lat DOUBLE PRECISION NOT NULL,
       lng DOUBLE PRECISION NOT NULL,
       area TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       status TEXT DEFAULT 'unverified',
       moderation_status TEXT DEFAULT 'pending_review',
       source TEXT DEFAULT 'community_local',
       evidence TEXT DEFAULT 'text',
       image_url TEXT,
       is_seeded BOOLEAN DEFAULT false
   );

   ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow public read access" ON public.citizen_reports FOR SELECT USING (true);
   CREATE POLICY "Allow public insert access" ON public.citizen_reports FOR INSERT WITH CHECK (true);
   ```
4. Copy your project URL and Anon key from **Project Settings → API** and add them to your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

---

## 🤖 Google Gemini Setup

The AI Assistant utilizes the official `@google/genai` unified SDK:

```env
# Server-only secret (Never expose to client code)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Supported model configurations include `gemini-3.5-flash-lite`, `gemini-3.8-flash`, and `gemini-flash-latest`.

---

## 🧪 Testing the AI Assistant

Run the automated test suite verifying all 4 edge cases:
```bash
npx tsx scripts/test-assistant-suite.ts
```
Expected output:
- **Test 1**: Normal request with Gemini API (Structured JSON verified)
- **Test 2**: Missing data resilience (0 POIs, 0 reports handled safely)
- **Test 3**: Malformed output simulation (Deterministic fallback activated)
- **Test 4**: API failure / invalid key simulation (Deterministic fallback labelled)

---

## 🛠️ Local Development

```bash
# 1. Clone repository
git clone https://github.com/adityaaadubey/citypulse-ai.git
cd citypulse-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Vercel Deployment

Deploy directly using Vercel CLI:
```bash
npx vercel --prod
```

Configure your Environment Variables in **Vercel Project Settings → Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: `gemini-3.5-flash-lite`)

---

## ⚖️ Safety & Data Transparency

- **Community Reports**: Reports submitted by citizens are unverified by default and clearly labeled.
- **Negative Proof**: Absence of community reports in a neighborhood is treated as a *data gap*, never as proof of safety.
- **Official Helplines**: The platform provides direct quick-dial emergency hotlines (112, 1091, 181).
- **Public API Data**: POI data © OpenStreetMap contributors. Weather data powered by Open-Meteo.
