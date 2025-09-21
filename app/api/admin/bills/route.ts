import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const auth = req.headers.get("authorization")
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  return auth === need ? null : "Unauthorized"
}

export async function GET(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("bills")
      .select(`
        id,
        billing_month,
        status,
        total_amount,
        due_date,
        contracts!bills_contract_id_fkey (
          profiles!contracts_tenant_id_fkey (
            first_name,
            last_name
          ),
          spaces (
            name
          )
        )
      `)
      .order("billing_month", { ascending: false })

    if (error) throw error

    const bills = (data || []).map((bill: any) => {
      const contract = bill.contracts?.[0]
      const profile = contract?.profiles?.[0]
      const space = contract?.spaces?.[0]
      return {
        id: bill.id,
        billing_month: bill.billing_month,
        status: bill.status,
        total_amount: Number(bill.total_amount),
        due_date: bill.due_date,
        tenant_name: profile ? `${profile.first_name} ${profile.last_name}` : "ไม่ระบุ",
        space_name: space?.name || "ไม่ระบุ",
      }
    })

    return NextResponse.json({ bills })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
