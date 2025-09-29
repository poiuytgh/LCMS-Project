import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  const got = req.headers.get("authorization")
  return got === need ? null : "Unauthorized"
}

export async function GET(req: Request) {
  const unauth = requireAdminAuth(req)
  if (unauth) return new Response(JSON.stringify({ error: unauth }), { status: 401 })

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim().toLowerCase() || ""
  const status = url.searchParams.get("status") || "" // pending|approved|rejected
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100)
  const supabase = createServerClient()

  try {
    // 1) ดึงสลิป
    const { data: slips, error: e1 } = await supabase
      .from("payment_slips")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (e1) throw e1

    const billIds = [...new Set((slips || []).map((s) => s.bill_id))]

    // 2) ดึงข้อมูลบิล + ผู้เช่า + พื้นที่ ของบิลที่เกี่ยวข้อง
    const { data: bills, error: e2 } = await supabase
      .from("bills")
      .select(`
        id, status, paid_date, billing_month, total_amount, contract_id,
        contracts!bills_contract_id_fkey (
          id, tenant_id,
          profiles!contracts_tenant_id_fkey ( first_name, last_name ),
          spaces ( name, code )
        )
      `)
      .in("id", billIds)

    if (e2) throw e2

    const billMap = new Map(bills?.map((b: any) => [b.id, b]))

    // 3) join + filter ฝั่งแอป
    let rows = (slips || []).map((s: any) => {
      const b = billMap.get(s.bill_id)
      const c = b?.contracts?.[0]
      const p = c?.profiles?.[0]
      const space = c?.spaces?.[0]
      const tenant_name = [p?.first_name, p?.last_name].filter(Boolean).join(" ")
      const space_label = `${space?.name || ""}${space?.code ? ` (${space.code})` : ""}`
      return {
        ...s,
        bill_status: b?.status,
        bill_paid_date: b?.paid_date,
        bill_billing_month: b?.billing_month,
        bill_total_amount: b?.total_amount,
        tenant_id: c?.id ? c?.tenant_id : null,
        tenant_name,
        space_name: space?.name || "",
        space_code: space?.code || "",
        space_label,
      }
    })

    if (status) rows = rows.filter((r) => r.status === status)
    if (q) {
      rows = rows.filter((r) => {
        const a = (r.tenant_name || "").toLowerCase()
        const b = (r.space_label || "").toLowerCase()
        const c = (r.file_name || "").toLowerCase()
        return a.includes(q) || b.includes(q) || c.includes(q)
      })
    }

    return new Response(JSON.stringify({ slips: rows }), { status: 200 })
  } catch (e: any) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 })
  }
}
