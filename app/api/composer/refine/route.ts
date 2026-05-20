// app/api/composer/refine/route.ts — Refine an existing caption with feedback

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { refineCaption } from "@/lib/composer";
import type { Brand } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, original, feedback, existingHashtags = [], variantGroup } = body;

    if (!brandId || !original || !feedback) {
      return NextResponse.json(
        { error: "brandId, original und feedback erforderlich" },
        { status: 400 }
      );
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

    const refined = await refineCaption(original, feedback, brand as Brand, existingHashtags);

    // Save to history as part of the same variant_group (or new one)
    const { data: saved } = await supabase
      .from("caption_history")
      .insert({
        brand_id: brandId,
        caption: refined.caption,
        hashtags: refined.hashtags,
        first_comment: refined.firstComment || null,
        topic: "Verfeinerung: " + feedback.slice(0, 80),
        variant_group: variantGroup || null,
        tone: null,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      variant: { ...refined, id: saved?.id || null },
    });
  } catch (error: any) {
    console.error("[composer/refine] ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
