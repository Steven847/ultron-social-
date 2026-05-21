// app/api/voice-modes/route.ts — List available voice modes

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");

    const supabase = getServerClient();
    let query = supabase
      .from("voice_modes")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];
    if (platform) {
      filtered = filtered.filter((m: any) => 
        Array.isArray(m.platforms) && m.platforms.includes(platform)
      );
    }

    return NextResponse.json({ voiceModes: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
