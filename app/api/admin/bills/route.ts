import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// --- Admin auth helper (DEV secret). อย่าใช้ในโปรดักชัน ---
function requireAdminAuth(req: Request): string | null {
  const auth = req.headers.get("authorization")
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  return auth === need ? null : "Unauthorized"
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()
    const { id } = params

    const { data, error } = await supabase
      .from("bills")
      .select(`
        id, contract_id, billing_month, rent_amount,
        water_previous_reading, water_current_reading, water_unit_rate, water_amount,
        power_previous_reading, power_current_reading, power_unit_rate, power_amount,
        internet_amount, other_charges, total_amount,
        status, due_date, paid_date, created_at, updated_at,
        contracts!inner (
          id,
          profiles!contracts_tenant_id_fkey ( first_name, last_name ),
          spaces ( name, code )
        )
      `)
      .eq("id", id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const contract = data.contracts?.[0]
    const profile = contract?.profiles?.[0]
    const space = contract?.spaces?.[0]

    return NextResponse.json({
      ...data,
      tenant_name: profile ? `${profile.first_name} ${profile.last_name}` : "",
      space_name: space?.name || "",
      space_code: space?.code || "",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const body = await req.json()
    const {
      billing_month,
      rent_amount,
      water_previous_reading,
      water_current_reading,
      water_unit_rate,
      power_previous_reading,
      power_current_reading,
      power_unit_rate,
      internet_amount,
      other_charges,
      due_date,
      status,
    } = body || {}

    const waterUnits = Math.max(0, Number(water_current_reading || 0) - Number(water_previous_reading || 0))
    const powerUnits = Math.max(0, Number(power_current_reading || 0) - Number(power_previous_reading || 0))
    const computedWaterAmount = waterUnits * Number(water_unit_rate || 0)
    const computedPowerAmount = powerUnits * Number(power_unit_rate || 0)
    const total =
      Number(rent_amount || 0) +
      Number(internet_amount || 0) +
      Number(other_charges || 0) +
      computedWaterAmount +
      computedPowerAmount

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("bills")
      .update({
        billing_month,
        rent_amount,
        water_previous_reading,
        water_current_reading,
        water_unit_rate,
        water_amount: computedWaterAmount,
        power_previous_reading,
        power_current_reading,
        power_unit_rate,
        power_amount: computedPowerAmount,
        internet_amount,
        other_charges,
        total_amount: total,
        due_date,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, bill: data })
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
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
