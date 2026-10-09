-- CityPulse AI: Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create citizen_reports table
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

-- 2. Create index on location and category for fast geo queries
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.citizen_reports (category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.citizen_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON public.citizen_reports (lat, lng);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Allow read access to anyone
CREATE POLICY "Allow public read access"
ON public.citizen_reports
FOR SELECT
USING (true);

-- 5. Policies: Allow anonymous inserts for community reports
CREATE POLICY "Allow public insert access"
ON public.citizen_reports
FOR INSERT
WITH CHECK (true);

-- 6. Insert seed reports
INSERT INTO public.citizen_reports (id, category, title, detail, lat, lng, area, created_at, status, moderation_status, source, evidence, is_seeded)
VALUES
('report-1', 'congestion', 'Heavy evening crowd', 'Community demo report: weekend food queues and footpath crowding around FC Road.', 18.5236, 73.8408, 'Shivajinagar', '2026-10-08T16:30:00Z', 'unverified', 'auto_reviewed', 'demo_seed', 'text', true),
('report-2', 'poor_lighting', 'Patchy lane lighting', 'Community demo report: one connecting lane was described as dim after dark.', 18.5668, 73.9128, 'Viman Nagar', '2026-10-07T14:15:00Z', 'unverified', 'auto_reviewed', 'demo_seed', 'text', true),
('report-3', 'flooding', 'Waterlogging after rain', 'Community demo report: temporary waterlogging mentioned near a junction.', 18.5190, 73.8569, 'Kasba Peth', '2026-10-06T10:05:00Z', 'unverified', 'auto_reviewed', 'demo_seed', 'text', true)
ON CONFLICT (id) DO NOTHING;
