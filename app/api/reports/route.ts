import { NextResponse } from "next/server";
import { demoReports } from "@/lib/data";
import { isSupabaseConfigured, mapCitizenReportToRow, mapRowToCitizenReport, supabase, SupabaseReportRow } from "@/lib/supabase";
import type { CitizenReport } from "@/lib/types";

// In-memory store fallback when Supabase is not yet connected
let inMemoryReports: CitizenReport[] = [...demoReports];

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("citizen_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Supabase select error:", error.message);
        return NextResponse.json({
          reports: inMemoryReports,
          source: "fallback",
          supabaseConnected: true,
          error: error.message
        });
      }

      const mappedReports = ((data || []) as unknown as SupabaseReportRow[]).map(mapRowToCitizenReport);
      return NextResponse.json({
        reports: mappedReports.length > 0 ? mappedReports : demoReports,
        source: "supabase",
        supabaseConnected: true
      });
    } catch (err) {
      console.error("Supabase fetch exception:", err);
      return NextResponse.json({
        reports: inMemoryReports,
        source: "fallback",
        supabaseConnected: false
      });
    }
  }

  // Fallback when Supabase env vars are not set
  return NextResponse.json({
    reports: inMemoryReports,
    source: "local",
    supabaseConnected: false,
    message: "Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured yet."
  });
}

export async function POST(request: Request) {
  try {
    const rawReport = (await request.json()) as Partial<CitizenReport>;

    // Strict validation
    if (!rawReport.title || !rawReport.detail || !rawReport.coordinates) {
      return NextResponse.json({ error: "Missing required report fields (title, detail, coordinates)" }, { status: 400 });
    }

    const validCategories = ["safety_concerns", "waterlogging", "poor_lighting", "accident", "obstruction"];
    const category = validCategories.includes(rawReport.category as string)
      ? (rawReport.category as CitizenReport["category"])
      : "safety_concerns";

    // Sanitize strings against XSS
    const sanitize = (text: string, maxLen: number) =>
      text
        .replace(/<[^>]*>?/gm, "")
        .replace(/[<>'"&]/g, (char) => {
          switch (char) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "'": return "&#39;";
            case "\"": return "&quot;";
            case "&": return "&amp;";
            default: return char;
          }
        })
        .trim()
        .slice(0, maxLen);

    const title = sanitize(String(rawReport.title), 100);
    const detail = sanitize(String(rawReport.detail), 1000);
    const area = sanitize(String(rawReport.area || "City"), 100);

    // Validate coordinate boundaries
    const lat = Number(rawReport.coordinates.lat);
    const lng = Number(rawReport.coordinates.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates provided" }, { status: 400 });
    }

    const report: CitizenReport = {
      id: rawReport.id && /^cp-[a-zA-Z0-9_-]+$/.test(rawReport.id)
        ? rawReport.id
        : `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      title,
      detail,
      area,
      coordinates: { lat, lng },
      createdAt: rawReport.createdAt && !Number.isNaN(Date.parse(rawReport.createdAt))
        ? rawReport.createdAt
        : new Date().toISOString(),
      status: "unverified",
      moderationStatus: "pending_review",
      source: "community_local",
      evidence: rawReport.evidence === "text_image" ? "text_image" : "text",
      imageDataUrl: rawReport.imageDataUrl?.startsWith("data:image/") ? rawReport.imageDataUrl : undefined,
      isSeeded: false
    };

    if (isSupabaseConfigured && supabase) {
      const row = mapCitizenReportToRow(report);
      const { data, error } = await supabase
        .from("citizen_reports")
        .insert([row])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error.message);
        // Fallback to in-memory
        inMemoryReports = [report, ...inMemoryReports];
        return NextResponse.json({
          report,
          source: "local_fallback",
          supabaseConnected: true,
          error: error.message
        });
      }

      const savedReport = mapRowToCitizenReport(data as unknown as SupabaseReportRow);
      return NextResponse.json({
        report: savedReport,
        source: "supabase",
        supabaseConnected: true
      }, { status: 201 });
    }

    // Save to in-memory fallback
    inMemoryReports = [report, ...inMemoryReports];
    return NextResponse.json({
      report,
      source: "local",
      supabaseConnected: false
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to process report"
    }, { status: 500 });
  }
}
