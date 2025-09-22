import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { createClient as createRLSClient } from "@supabase/supabase-js"

/** ดึง user token จาก Authorization: Bearer ... */
function getBearer(req: Request) {
  const h = req.headers.get("authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] || null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const billId = params.id
    const token = getBearer(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) return NextResponse.json({ error: "Supabase env missing" }, { status: 500 })

    // 1) ตรวจสิทธิ์ด้วย RLS client (user token)
    const rls = createRLSClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: canSee, error: selErr } = await rls
      .from("bills")
      .select("id")
      .eq("id", billId)
      .limit(1)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 400 })
    if (!canSee || canSee.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2) อัปเดตสถานะด้วย service-role (ไม่มี RLS update สำหรับผู้ใช้)
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("bills")
      .update({ status: "paid", paid_date: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", billId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // (อาจ) อัปเดต payment_slips ที่ล่าสุดของบิลนี้เป็น approved ก็ได้ ถ้าต้องการ
    // await supabase.from("payment_slips").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("bill_id", billId)

    return NextResponse.json({
      ok: true,
      bill: data,
      // ให้ user ไปดาวน์โหลดจาก proxy route ด้านล่าง
      receiptUrl: `/api/user/bills/${billId}/receipt`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
