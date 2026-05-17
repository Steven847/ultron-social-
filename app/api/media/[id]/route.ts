// app/api/media/[id]/route.ts — Get, update, delete a media item

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("media")
      .select("*, brands(name, slug)")
      .eq("id", id)
      .single();
    if (error) throw error;

    const bucket = data.source === "upload" ? "media-uploads" : "ai-generated";
    const { data: signedData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.storage_path, 3600);

    return NextResponse.json({ media: { ...data, url: signedData?.signedUrl || null } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServerClient();

    const allowed: any = {};
    if (body.title !== undefined) allowed.title = body.title;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.tags !== undefined) allowed.tags = body.tags;
    if (body.category !== undefined) allowed.category = body.category;
    if (body.mood !== undefined) allowed.mood = body.mood;
    if (body.is_favorite !== undefined) allowed.is_favorite = body.is_favorite;
    if (body.archived !== undefined) allowed.archived = body.archived;

    const { data, error } = await supabase
      .from("media")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ media: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();

    // Get item to find storage path
    const { data: item, error: fetchError } = await supabase
      .from("media")
      .select("storage_path, source, thumbnail_path")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const bucket = item.source === "upload" ? "media-uploads" : "ai-generated";

    // Delete files from storage
    const pathsToDelete = [item.storage_path];
    if (item.thumbnail_path) pathsToDelete.push(item.thumbnail_path);
    await supabase.storage.from(bucket).remove(pathsToDelete);

    // Delete DB row
    const { error: deleteError } = await supabase.from("media").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
