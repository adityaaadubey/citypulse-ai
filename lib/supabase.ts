import { createClient } from "@supabase/supabase-js";
import type { CitizenReport } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export type SupabaseReportRow = {
  id: string;
  category: string;
  title: string;
  detail: string;
  lat: number;
  lng: number;
  area: string;
  created_at: string;
  status: string;
  moderation_status: string;
  source: string;
  evidence: string;
  image_url: string | null;
  is_seeded: boolean;
};

export function mapRowToCitizenReport(row: SupabaseReportRow): CitizenReport {
  return {
    id: row.id,
    category: row.category as CitizenReport["category"],
    title: row.title,
    detail: row.detail,
    coordinates: {
      lat: Number(row.lat),
      lng: Number(row.lng)
    },
    area: row.area,
    createdAt: row.created_at,
    status: (row.status as CitizenReport["status"]) || "unverified",
    moderationStatus: (row.moderation_status as CitizenReport["moderationStatus"]) || "pending_review",
    source: (row.source as CitizenReport["source"]) || "community_local",
    evidence: (row.evidence as CitizenReport["evidence"]) || "text",
    imageDataUrl: row.image_url || undefined,
    isSeeded: Boolean(row.is_seeded)
  };
}

export function mapCitizenReportToRow(report: CitizenReport): SupabaseReportRow {
  return {
    id: report.id,
    category: report.category,
    title: report.title,
    detail: report.detail,
    lat: report.coordinates.lat,
    lng: report.coordinates.lng,
    area: report.area,
    created_at: report.createdAt,
    status: report.status,
    moderation_status: report.moderationStatus,
    source: report.source,
    evidence: report.evidence,
    image_url: report.imageDataUrl || null,
    is_seeded: report.isSeeded
  };
}
