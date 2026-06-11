import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("ledger")
    .select("*")
    .order("entry_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, source = "", type, amount, entry_date } = body;

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!type || !["incoming", "outgoing"].includes(type))
    return NextResponse.json({ error: "Type must be incoming or outgoing." }, { status: 400 });
  if (!amount || isNaN(Number(amount)))
    return NextResponse.json({ error: "Amount is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("ledger")
    .insert({ title, source, type, amount: Number(amount), entry_date: entry_date || new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
