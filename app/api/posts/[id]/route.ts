// app/api/posts/[id]/route.ts — Manage individual posts

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*, brands(name, slug, logo_url)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return NextResponse.json({ post: data });
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
    const fields = [
      "title",
      "tone",
      "caption",
      "hashtags",
      "first_comment",
      "media_ids",
      "platforms",
      "scheduled_at",
      "status",
      "type",
    ];
    for (const f of fields) if (body[f] !== undefined) allowed[f] = body[f];

    const { data, error } = await supabase
      .from("posts")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ post: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
