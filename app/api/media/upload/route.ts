// app/api/media/upload/route.ts — Upload real photos/videos to Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const brandId = formData.get("brandId") as string;
    const category = (formData.get("category") as string) || null;
    const tagsRaw = (formData.get("tags") as string) || "";
    const title = (formData.get("title") as string) || null;
    const mood = (formData.get("mood") as string) || null;

    if (!file || !brandId) {
      return NextResponse.json({ error: "file und brandId erforderlich" }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei darf max 100 MB groß sein" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Nur Bilder und Videos erlaubt" }, { status: 400 });
    }

    const supabase = getServerClient();

    // Get brand slug for path
    const { data: brand } = await supabase
      .from("brands")
      .select("slug")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4");
    const safeBasename = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    const filePath = `${brand.slug}/uploads/${Date.now()}-${safeBasename}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("media-uploads")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Parse tags
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Insert metadata
    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: isImage ? "image" : "video",
        source: "upload",
        storage_path: filePath,
        file_size: file.size,
        category,
        tags: tags.length > 0 ? tags : null,
        mood,
        title: title || file.name,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, media: mediaRow });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
