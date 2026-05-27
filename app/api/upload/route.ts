// app/api/upload/route.ts — Robust file upload with filename sanitization
// v0.7: Handles iPhone HEIC, special characters, large files

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export const maxDuration = 60;

const MAX_FILE_SIZE_MB = 100; // Storage bucket limit
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // iPhone .mov
  "video/webm",
];

/**
 * Sanitize filename to be safe for Supabase Storage.
 * Storage rejects: special chars, very long names, leading dots, etc.
 */
function sanitizeFilename(originalName: string): string {
  // Get extension
  const lastDot = originalName.lastIndexOf(".");
  let baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
  let ext = lastDot > 0 ? originalName.substring(lastDot).toLowerCase() : "";

  // Normalize unicode (e.g. ö → o, ü → u when not supported)
  baseName = baseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace anything not alphanumeric/dash/underscore with underscore
  baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Collapse multiple underscores
  baseName = baseName.replace(/_+/g, "_");

  // Trim leading/trailing underscores
  baseName = baseName.replace(/^_+|_+$/g, "");

  // Limit length
  if (baseName.length > 50) {
    baseName = baseName.substring(0, 50);
  }

  // Empty? Fallback name
  if (!baseName) {
    baseName = "upload";
  }

  // Sanitize extension (only allow common ones)
  if (!ext || ext.length > 5) {
    ext = ".bin";
  }

  return baseName + ext;
}

/**
 * Detect MIME type from file content (magic bytes) when File API lies.
 * iPhone HEIC files sometimes report as octet-stream.
 */
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // HEIC/HEIF: typically has "ftyp" at byte 4, followed by "heic"/"heix"/"mif1"/"msf1"
  if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "heic" || brand === "heix" || brand === "mif1" || brand === "msf1") {
      return "image/heic";
    }
    if (brand === "qt  " || brand === "isom" || brand === "mp42") {
      return "video/quicktime"; // .mov from iPhone
    }
  }
  // MP4: ftyp brand check
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return "video/mp4";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const brandId = formData.get("brandId") as string | null;
    const title = (formData.get("title") as string | null) || null;
    const tagsStr = (formData.get("tags") as string | null) || "";
    const userType = formData.get("type") as string | null; // optional override

    if (!file) {
      return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    }
    if (!brandId) {
      return NextResponse.json({ error: "brandId erforderlich" }, { status: 400 });
    }

    // Check size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `Datei ist ${sizeMB.toFixed(1)} MB groß. Maximum ${MAX_FILE_SIZE_MB} MB.` },
        { status: 400 }
      );
    }

    console.log(`[upload] File: "${file.name}", reported MIME: "${file.type}", size: ${sizeMB.toFixed(2)} MB`);

    // Read file
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (e: any) {
      console.error("[upload] arrayBuffer failed:", e.message);
      return NextResponse.json(
        { error: "Datei konnte nicht gelesen werden. Bitte ein anderes Format versuchen." },
        { status: 400 }
      );
    }

    const buffer = new Uint8Array(arrayBuffer);

    // Detect actual MIME type from bytes (more reliable than file.type)
    const detectedMime = detectMimeFromBytes(buffer);
    let finalMime = file.type;
    if (!finalMime || finalMime === "application/octet-stream" || finalMime === "") {
      finalMime = detectedMime || "application/octet-stream";
    } else if (detectedMime && detectedMime !== finalMime) {
      // Trust detected MIME over what browser said (browsers lie about HEIC)
      console.log(`[upload] MIME mismatch: file.type=${finalMime}, detected=${detectedMime}, using detected`);
      finalMime = detectedMime;
    }

    // Determine type
    let mediaType: "image" | "video";
    if (ALLOWED_IMAGE_TYPES.includes(finalMime)) {
      mediaType = "image";
    } else if (ALLOWED_VIDEO_TYPES.includes(finalMime)) {
      mediaType = "video";
    } else if (userType === "image" || userType === "video") {
      mediaType = userType;
    } else {
      return NextResponse.json(
        {
          error: `Dateityp "${finalMime}" wird nicht unterstützt. Erlaubt: JPG, PNG, WebP, GIF, HEIC, MP4, MOV, WebM.`,
          detectedMime,
          reportedMime: file.type,
        },
        { status: 400 }
      );
    }

    // Look up brand for slug
    const supabase = getServerClient();
    const { data: brand } = await supabase
      .from("brands")
      .select("id, slug")
      .eq("id", brandId)
      .single();
    if (!brand) {
      return NextResponse.json({ error: "Marke nicht gefunden" }, { status: 404 });
    }

    // Build safe storage path
    const sanitized = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const storagePath = `${brand.slug}/uploads/${timestamp}-${sanitized}`;

    console.log(`[upload] Uploading to: ${storagePath}, MIME: ${finalMime}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("media-uploads")
      .upload(storagePath, buffer, {
        contentType: finalMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload] Storage upload failed:", uploadError.message);
      return NextResponse.json(
        { error: `Upload fehlgeschlagen: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Save metadata in DB
    const tagArr = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { data: mediaRow, error: insertError } = await supabase
      .from("media")
      .insert({
        brand_id: brandId,
        type: mediaType,
        source: "upload",
        storage_path: storagePath,
        file_size: buffer.length,
        title: title || sanitized,
        tags: tagArr.length > 0 ? tagArr : null,
      })
      .select()
      .single();

    if (insertError) {
      // Try to clean up the uploaded file
      await supabase.storage.from("media-uploads").remove([storagePath]).catch(() => {});
      console.error("[upload] DB insert failed:", insertError.message);
      return NextResponse.json(
        { error: `Speichern der Metadaten fehlgeschlagen: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`[upload] Success: ${mediaRow.id}`);

    return NextResponse.json({
      success: true,
      media: mediaRow,
      detectedMime,
      reportedMime: file.type,
    });
  } catch (error: any) {
    console.error("[upload] ERROR:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Upload fehlgeschlagen" },
      { status: 500 }
    );
  }
}
