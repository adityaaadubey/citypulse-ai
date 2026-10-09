# CityPulse AI 🏙️
> Smart City Exploration & Situational Intelligence MVP

CityPulse AI is a Next.js (App Router) + TypeScript + Tailwind CSS application providing real-time city exploration, OpenStreetMap POI discovery, weather intelligence, and community incident reporting with Supabase synchronization.

---

## 🌟 Key Features

1. **Interactive Geospatial Map**: Leaflet.js-based dynamic city map with custom pins for food, attractions, heritage, hotels, budget spots, and citizen safety reports.
2. **Real-time City Geocoding**: Search any city or neighborhood worldwide via OpenStreetMap Nominatim with automated viewport bounds and coordinate targeting.
3. **Live POI Discovery**: Query Overpass API dynamically with category filters, deduplication, and intelligent fallback handling.
4. **Coordinate-based Weather**: Real-time temperature, wind speed, and atmospheric conditions powered by Open-Meteo.
5. **Community Incident Reporting (Supabase-integrated)**: Citizen reporting for congestion, poor lighting, waterlogging, accidents, and safety concerns with offline fallback.
6. **AI Situational Assistant**: Context-aware recommendations powered by OpenAI, with rule-based fail-safes.
7. **Women's Travel & Timing Aid**: Contextual heuristics highlighting lighting, crowding, and night-travel precautions.

---

## 🚀 Supabase Setup

1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard and execute the script provided in:
   ```
   supabase/schema.sql
   ```
3. Copy your project credentials from **Project Settings -> API** and add them to `.env.local` or Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:5173](http://localhost:5173).

---

## 🚢 Deployment

Deploy directly to Vercel:
```bash
npx vercel --prod
```
Ensure you configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your Vercel Project Settings for production cloud sync.
