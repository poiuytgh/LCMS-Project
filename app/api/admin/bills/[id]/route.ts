import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const enforce = process.env.NODE_ENV === "production"
  if (!enforce) return null
  const auth = req.headers.get("authorization") || ""
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  return auth === need ? null : "Unauthorized"
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("bills")
      .select(`
        id,
        contract_id,
        billing_month,
        rent_amount,
        water_previous_reading,
        water_current_reading,
        water_unit_rate,
        water_amount,
        power_previous_reading,
        power_current_reading,
        power_unit_rate,
        power_amount,
        internet_amount,
        other_charges,
        total_amount,
        status,
        due_date,
        paid_date,
        created_at,
        contracts!bills_contract_id_fkey (
          id,
          tenant_id,
          profiles!contracts_tenant_id_fkey ( first_name, last_name ),
          spaces ( name, code )
        )
      `)
      .eq("id", params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// PATCH /api/admin/bills/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const body = await req.json()

    // อนุญาตอัปเดตบางฟิลด์เท่านั้น
    const allowed: any = {}
    const allowKeys = new Set([
      "rent_amount",
      "water_previous_reading",
      "water_current_reading",
      "water_unit_rate",
      "water_amount",
      "power_previous_reading",
      "power_current_reading",
      "power_unit_rate",
      "power_amount",
      "internet_amount",
      "other_charges",
      "total_amount",
      "status",
      "due_date",
      "paid_date",
    ])
    for (const k of Object.keys(body || {})) {
      if (allowKeys.has(k)) allowed[k] = body[k]
    }

    // คำนวณ amount อัตโนมัติถ้าส่ง current/prev/rate มา
    const hasWaterCalc =
      ["water_previous_reading", "water_current_reading", "water_unit_rate"].some((k) => k in allowed)
    const hasPowerCalc =
      ["power_previous_reading", "power_current_reading", "power_unit_rate"].some((k) => k in allowed)

    if (hasWaterCalc) {
      const prev = Number(allowed.water_previous_reading ?? 0)
      const curr = Number(allowed.water_current_reading ?? 0)
      const rate = Number(allowed.water_unit_rate ?? 0)
      const units = Math.max(0, curr - prev)
      allowed.water_amount = Number((units * rate).toFixed(2))
    }

    if (hasPowerCalc) {
      const prev = Number(allowed.power_previous_reading ?? 0)
      const curr = Number(allowed.power_current_reading ?? 0)
      const rate = Number(allowed.power_unit_rate ?? 0)
      const units = Math.max(0, curr - prev)
      allowed.power_amount = Number((units * rate).toFixed(2))
    }

    // ถ้ามีฟิลด์ย่อยเปลี่ยน แนะนำคำนวณ total ใหม่
    if (
      ["rent_amount", "water_amount", "power_amount", "internet_amount", "other_charges"].some((k) => k in allowed)
    ) {
      const supabase = createServerClient()
      const { data: oldBill } = await supabase.from("bills").select("*").eq("id", params.id).single()
      const current = { ...(oldBill || {}), ...allowed }
      const total =
        Number(current.rent_amount || 0) +
        Number(current.water_amount || 0) +
        Number(current.power_amount || 0) +
        Number(current.internet_amount || 0) +
        Number(current.other_charges || 0)
      allowed.total_amount = Number(total.toFixed(2))
    }

    const supabase = createServerClient()
    const { error } = await supabase.from("bills").update(allowed).eq("id", params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()
    const { error } = await supabase.from("bills").delete().eq("id", params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
