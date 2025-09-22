import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createClient as createRLSClient } from "@supabase/supabase-js";

/** ดึง user token จาก Authorization: Bearer ... */
function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

/** คืน object ตัวแรก ถ้าเป็น array (รองรับรูปแบบ embed ของ PostgREST) */
const toOne = <T = any>(v: any): T | undefined => (Array.isArray(v) ? v[0] : v);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id;
    const token = getBearer(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    // 1) ตรวจสิทธิ์ด้วย RLS client (user token) ว่าผู้ใช้เข้าถึงบิลนี้ได้จริง
    const rls = createRLSClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: canSee, error: selErr } = await rls
      .from("bills")
      .select("id")
      .eq("id", billId)
      .limit(1);

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 400 });
    }
    if (!canSee || canSee.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) ใช้ service-role (server) สำหรับงานที่ต้อง bypass RLS เช่น update + insert notifications
    const supabase = createServerClient();

    // ดึง context ของบิลเพื่อสร้างข้อความแจ้งเตือน (เดือน + ชื่อพื้นที่)
    const { data: billCtx, error: ctxErr } = await supabase
      .from("bills")
      .select(
        `
        id, billing_month, contract_id,
        contracts!inner (
          id, tenant_id,
          spaces ( name, code )
        )
      `
      )
      .eq("id", billId)
      .single();

    if (ctxErr) {
      return NextResponse.json({ error: ctxErr.message }, { status: 400 });
    }

    const contract = toOne<any>(billCtx?.contracts);
    const space = contract?.spaces ? toOne<any>(contract.spaces) : undefined;

    // 3) อัปเดตสถานะบิลเป็น "PENDING_APPROVAL" (รอตรวจสอบ)
    const { data: updated, error: updErr } = await supabase
      .from("bills")
      .update({
        status: "PENDING_APPROVAL",
        // ไม่ควรตั้ง paid_date ที่ขั้นตอนนี้
        updated_at: new Date().toISOString(),
      })
      .eq("id", billId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // 4) แจ้งเตือน Admin ทุกคน
    //    - สมมติว่ามีตาราง profiles ที่มี field role = 'admin'
    const { data: admins, error: adminErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!adminErr && admins && admins.length > 0) {
      const monthTh = new Date(String(billCtx.billing_month)).toLocaleDateString(
        "th-TH",
        { month: "long", year: "numeric" }
      );

      const msg =
        `ผู้เช่าได้ยืนยันการชำระเงินสำหรับบิลเดือน ${monthTh}` +
        (space?.name || space?.code
          ? ` สำหรับ ${space?.name ?? ""}${space?.code ? ` (${space.code})` : ""}`
          : "");

      const rows = admins.map((a: any) => ({
        user_id: a.id,
        title: "การชำระเงินใหม่",
        message: msg,
        type: "bill",
        related_id: billId,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { error: nErr } = await supabase.from("notifications").insert(rows);
      if (nErr) {
        // ไม่ล้มงานหลัก ถ้า push แจ้งเตือนล้มเหลว
        return NextResponse.json({
          ok: true,
          bill: updated,
          warn: `บันทึกแจ้งเตือนไม่สำเร็จ: ${nErr.message}`,
          receiptUrl: `/api/user/bills/${billId}/receipt`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      bill: updated,
      receiptUrl: `/api/user/bills/${billId}/receipt`,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
