// app/api/jobs/recent/route.ts — Find most recent running job for a brand
// Used as fallback when client doesn't have the jobId yet

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("id, status, phase, phase_message, progress_percent, started_at, job_type")
      .eq("brand_id", brandId)
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ jobId: null });
    }

    return NextResponse.json({ jobId: data[0].id, job: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
