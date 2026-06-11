import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  let query = supabase
    .from("taxonomy")
    .select("*")
    .order("name", { ascending: true });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, name, description, slug } = body;

  if (!type || !name || !slug) {
    return NextResponse.json({ error: "Type, name, and slug are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("taxonomy")
    .insert({ type, name, description: description || null, slug })
    .select()
    .single();

  if (error) {
    const msg = error.code === "23505" ? "A taxonomy entry with this slug already exists." : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
