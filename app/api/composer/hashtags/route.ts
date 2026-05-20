// app/api/composer/hashtags/route.ts — Suggest hashtags for a brand + context

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { suggestHashtags } from "@/lib/composer";
import type { Brand } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, context } = body;

    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }

    const supabase = getServerClient();

    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    const result = await suggestHashtags(brand as Brand, context || "Allgemeiner Post", 15);
    return NextResponse.json({ success: true, hashtags: result });
  } catch (error: any) {
    console.error("[composer/hashtags] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
