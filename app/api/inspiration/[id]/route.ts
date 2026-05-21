// app/api/inspiration/[id]/route.ts — Manage individual inspiration posts

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServerClient();

    if (body.action === "use") {
      const { data: current } = await supabase
        .from("inspiration_posts")
        .select("used_count")
        .eq("id", id)
        .single();
      const { data } = await supabase
        .from("inspiration_posts")
        .update({
          used_count: (current?.used_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      return NextResponse.json({ inspiration: data });
    }

    const allowed: any = {};
    const fields = ["title", "caption", "platform", "source_url", "source_account", "tags", "notes", "why_it_works"];
    for (const f of fields) if (body[f] !== undefined) allowed[f] = body[f];

    const { data, error } = await supabase
      .from("inspiration_posts")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ inspiration: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { error } = await supabase.from("inspiration_posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
