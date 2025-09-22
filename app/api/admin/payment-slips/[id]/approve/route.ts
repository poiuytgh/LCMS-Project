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
    // 1) ดึงสลิป + บิล + tenant
    const { data: slip, error: e1 } = await supabase
      .from("payment_slips")
      .select(`
        id, bill_id, status,
        bills!payment_slips_bill_id_fkey(
          id, status, paid_date, contract_id,
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

    // 2) อัปเดตสลิป → approved
    const { error: e2 } = await supabase
      .from("payment_slips")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", params.id)
    if (e2) throw e2

    // 3) ย้ำบิล → paid + paid_date (ถ้ายังไม่มี)
    const { error: e3 } = await supabase
      .from("bills")
      .update({ status: "paid", paid_date: bill?.paid_date || new Date().toISOString() })
      .eq("id", bill?.id)
    if (e3) throw e3

    // 4) แจ้งเตือนผู้เช่า
    if (tenantId) {
      await supabase.from("notifications").insert([
        {
          user_id: tenantId,
          title: "ยืนยันการชำระเงินแล้ว",
          message: "สลิปของคุณได้รับการอนุมัติ และบิลถูกยืนยันการชำระแล้ว",
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
