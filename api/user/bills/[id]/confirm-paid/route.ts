// app/api/user/bills/[id]/confirm-paid/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

type RouteParams = { params: { id: string } }

/**
 * Helper: ดึง Bearer token จาก Header หรือ query (?t=...)
 */
function getAccessToken(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  // fallback สำหรับ dev: แนบ token เป็น query: ?t=<jwt>
  try {
    const url = new URL(req.url)
    const t = url.searchParams.get("t")
    return t || null
  } catch {
    return null
  }
}

/**
 * POST /api/user/bills/[id]/confirm-paid
 * Mark bill = paid (หลังอัปโหลดสลิป) แล้วคืน URL ใบเสร็จให้ผู้ใช้
 */
export async function POST(req: Request, { params }: RouteParams) {
  const billId = params?.id
  if (!billId) {
    return NextResponse.json({ error: "ไม่พบบิลที่ต้องการยืนยัน" }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // 1) ตรวจสอบสิทธิ์ผู้ใช้
    const token = getAccessToken(req)
    if (!token) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน (missing token)" }, { status: 401 })
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token)

    if (userErr || !user) {
      return NextResponse.json({ error: "สิทธิ์ไม่ถูกต้อง หรือเซสชันหมดอายุ" }, { status: 401 })
    }

    // 2) โหลดบิล + ตรวจสอบว่าเป็นของผู้ใช้คนนี้จริง
    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .select("id,status,contract_id,billing_month,due_date")
      .eq("id", billId)
      .single()

    if (billErr || !bill) {
      return NextResponse.json({ error: "ไม่พบบิลในระบบ" }, { status: 404 })
    }

    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id,tenant_id")
      .eq("id", bill.contract_id)
      .single()

    if (cErr || !contract) {
      return NextResponse.json({ error: "สัญญาที่เกี่ยวข้องไม่ถูกต้อง" }, { status: 400 })
    }

    if (contract.tenant_id !== user.id) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ยืนยันชำระสำหรับบิลนี้" }, { status: 403 })
    }

    // 3) ถ้ายังไม่ paid → อัปเดตสถานะเป็น paid + เซ็ต paid_date
    if (bill.status !== "paid") {
      const { error: upErr } = await supabase
        .from("bills")
        .update({ status: "paid", paid_date: new Date().toISOString() })
        .eq("id", billId)

      if (upErr) {
        return NextResponse.json({ error: "อัปเดตสถานะบิลไม่สำเร็จ" }, { status: 500 })
      }
    }

    // (ทางเลือก) จะบันทึก notification ไว้ด้วยก็ได้ — ข้ามได้ถ้ายังไม่จำเป็น
    // await supabase.from("notifications").insert({
    //   user_id: user.id,
    //   title: "ชำระเงินสำเร็จ",
    //   message: "ระบบได้ยืนยันการชำระเงินของคุณแล้ว",
    //   type: "bill",
    //   related_id: billId,
    // })

    // 4) คืนลิงก์ใบเสร็จฝั่ง user
    // หมายเหตุ: ถ้าจะเปิดจาก client พร้อมแนบ token ให้เอา receiptUrl ไปต่อเป็น ?t=<token> เองที่ฝั่ง client
    const receiptUrl = `/api/user/bills/${billId}/receipt`

    return NextResponse.json({
      ok: true,
      billId,
      status: "paid",
      receiptUrl,
      message: "ยืนยันการชำระเงินเรียบร้อย",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 })
  }
}
