// app/api/editor/templates/[id]/route.ts — Manage individual templates

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServerClient();

    // Handle special "increment use count" action
    if (body.action === "use") {
      const { data: current } = await supabase
        .from("overlay_templates")
        .select("used_count")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("overlay_templates")
        .update({
          used_count: (current?.used_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ template: data });
    }

    // Regular updates
    const allowed: any = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.layers !== undefined) allowed.layers = body.layers;
    if (body.format !== undefined) allowed.format = body.format;
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("overlay_templates")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getServerClient();
    const { error } = await supabase.from("overlay_templates").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
