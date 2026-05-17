// app/api/upload/logo/route.ts - Brand logo upload to Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const brandId = formData.get("brandId") as string;

    if (!file || !brandId) {
      return NextResponse.json({ error: "file und brandId sind erforderlich" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Logo darf max 5 MB groß sein" }, { status: 400 });
    }

    const supabase = getServerClient();

    // Get brand to determine filename
    const { data: brand } = await supabase.from("brands").select("slug").eq("id", brandId).single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${brand.slug}/logo-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("brand-logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL (brand-logos is public bucket)
    const { data: { publicUrl } } = supabase.storage.from("brand-logos").getPublicUrl(filePath);

    // Update brand
    const { error: updateError } = await supabase
      .from("brands")
      .update({ logo_url: publicUrl })
      .eq("id", brandId);

    if (updateError) throw updateError;

    return NextResponse.json({ url: publicUrl, path: filePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
