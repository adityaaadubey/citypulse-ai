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
    const report = (await request.json()) as CitizenReport;

    if (!report.title || !report.detail || !report.coordinates) {
      return NextResponse.json({ error: "Missing required report fields" }, { status: 400 });
    }

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
