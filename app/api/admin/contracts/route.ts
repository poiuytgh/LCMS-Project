import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        id,
        rent_amount,
        deposit_amount,
        start_date,
        end_date,
        status,
        terms,
        created_at,
        profiles!contracts_tenant_id_fkey ( first_name, last_name ),
        spaces ( name, code, type, description )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    console.error("admin contracts GET error:", e)
    return NextResponse.json({ error: e?.message ?? "fetch_failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      tenant_id,
      space_id,
      rent_amount,
      deposit_amount,
      start_date,
      end_date,
      status,
      terms,
    } = body || {}

    if (!tenant_id || !space_id)
      return NextResponse.json({ error: "tenant_id and space_id are required" }, { status: 400 })

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        tenant_id,
        space_id,
        rent_amount,
        deposit_amount,
        start_date,
        end_date,
        status: status || "active",
        terms: terms || "",
      })
      .select("id")
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e: any) {
    console.error("admin contracts POST error:", e)
    return NextResponse.json({ error: e?.message ?? "create_failed" }, { status: 500 })
  }
}
