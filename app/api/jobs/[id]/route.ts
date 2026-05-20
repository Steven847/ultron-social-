// app/api/jobs/[id]/route.ts — Poll job status during long-running operations

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // Job not found yet — return pending state (client just started, server still creating row)
      return NextResponse.json({
        status: "pending",
        phase: "init",
        phase_message: "Vorbereitung...",
        progress_percent: 0,
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
