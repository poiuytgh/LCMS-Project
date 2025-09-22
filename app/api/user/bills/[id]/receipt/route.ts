import { createServerClient } from "@/lib/supabase"

type RouteParams = { params: { id: string } }

function getAccessToken(req: Request) {
  const h = req.headers.get("authorization")
  if (h?.startsWith("Bearer ")) return h.slice(7)
  const url = new URL(req.url)
  return url.searchParams.get("t")
}

export async function GET(req: Request, { params }: RouteParams) {
  const billId = params?.id
  if (!billId) {
    return new Response(JSON.stringify({ error: "ไม่พบบิลที่ต้องการดาวน์โหลดใบเสร็จ" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const token = getAccessToken(req)
    if (!token) {
      return new Response(JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อน (missing token)" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createServerClient()

    // 1) ดึง user จาก JWT
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "สิทธิ์ไม่ถูกต้อง หรือเซสชันหมดอายุ" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 2) โหลดบิล
    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .select("id,status,contract_id")
      .eq("id", billId)
      .single()

    if (billErr || !bill) {
      return new Response(JSON.stringify({ error: "ไม่พบบิลในระบบ" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 3) ตรวจว่าเป็นบิลของผู้ใช้นี้จริง
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id,tenant_id")
      .eq("id", bill.contract_id)
      .single()

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "สัญญาที่เกี่ยวข้องไม่ถูกต้อง" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (contract.tenant_id !== user.id) {
      return new Response(JSON.stringify({ error: "คุณไม่มีสิทธิ์ดาวน์โหลดใบเสร็จของบิลนี้" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 4) อนุญาตให้ดาวน์โหลดเฉพาะบิลที่ชำระแล้ว
    if (bill.status !== "paid") {
      return new Response(JSON.stringify({ error: "บิลนี้ยังไม่ได้ชำระเงิน" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 5) Proxy ไปยัง admin endpoint ที่สร้าง PDF (ฝั่ง server ใส่ secret เอง)
    const adminSecret = process.env.ADMIN_SEED_SECRET
    if (!adminSecret) {
      return new Response(JSON.stringify({ error: "เซิร์ฟเวอร์ยังไม่ตั้งค่า ADMIN_SEED_SECRET" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const base = new URL(req.url)
    const adminUrl = new URL(`/api/admin/bills/${billId}/receipt`, `${base.protocol}//${base.host}`).toString()

    const adminRes = await fetch(adminUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminSecret}` },
      cache: "no-store",
    })

    if (!adminRes.ok) {
      const detail = await adminRes.text()
      return new Response(JSON.stringify({ error: "สร้างใบเสร็จไม่สำเร็จจากฝั่งแอดมิน", detail }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ส่ง PDF กลับให้ user
    const ab = await adminRes.arrayBuffer()
    const filename = `receipt-${billId}.pdf`

    return new Response(ab, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "เกิดข้อผิดพลาดภายในระบบ" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
