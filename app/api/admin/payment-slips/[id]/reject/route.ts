import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  const got = req.headers.get("authorization")
  return got === need ? null : "Unauthorized"
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauth = requireAdminAuth(req)
  if (unauth) return new Response(JSON.stringify({ error: unauth }), { status: 401 })
  const supabase = createServerClient()

  try {
    const body = await req.json().catch(() => ({}))
    const reason: string = (body?.reason || "").toString().slice(0, 500)

    // 1) ดึงสลิป + บิล + tenant
    const { data: slip, error: e1 } = await supabase
      .from("payment_slips")
      .select(`
        id, bill_id, status,
        bills!payment_slips_bill_id_fkey(
          id, status, contract_id,
          contracts!bills_contract_id_fkey(
            id, tenant_id
          )
        )
      `)
      .eq("id", params.id)
      .maybeSingle()
    if (e1) throw e1
    if (!slip) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })

    const bill = slip.bills?.[0]
    const contract = bill?.contracts?.[0]
    const tenantId = contract?.tenant_id

    // 2) อัปเดตสลิป → rejected + เหตุผล
    const { error: e2 } = await supabase
      .from("payment_slips")
      .update({ status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString() })
      .eq("id", params.id)
    if (e2) throw e2

    // 3) คืนสถานะบิล → unpaid + ล้าง paid_date
    const { error: e3 } = await supabase
      .from("bills")
      .update({ status: "unpaid", paid_date: null })
      .eq("id", bill?.id)
    if (e3) throw e3

    // 4) แจ้งเตือนผู้เช่า
    if (tenantId) {
      await supabase.from("notifications").insert([
        {
          user_id: tenantId,
          title: "สลิปการชำระถูกปฏิเสธ",
          message: reason ? `เหตุผล: ${reason}` : "สลิปของคุณถูกปฏิเสธ กรุณาอัปโหลดใหม่",
          type: "bill",
          related_id: bill?.id,
        },
      ])
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 })
  }
}
