import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Turns a ledger row's "compute" switch on or off: a custom entry's `computed`
// flag, or an order's `ledger_computed` flag for its derived ledger row.
export async function PATCH(req: NextRequest) {
  const { kind, id, computed } = await req.json();

  if (typeof id !== "string" || !id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (typeof computed !== "boolean") return NextResponse.json({ error: "computed must be true or false." }, { status: 400 });

  const { error } =
    kind === "order"
      ? await supabase.from("orders").update({ ledger_computed: computed }).eq("id", id)
      : kind === "custom"
      ? await supabase.from("ledger").update({ computed }).eq("id", id)
      : { error: { message: "kind must be order or custom." } };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
