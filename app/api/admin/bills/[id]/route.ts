import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";


function requireAdminAuth(req: Request): string | null {
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`;
  const got = req.headers.get("authorization");
  return got === need ? null : "Unauthorized";
}

function thMonth(s?: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();

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
      .single();

    if (error || !data) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const body = await req.json();

    const allowed: Record<string, any> = {};
    const allowKeys = new Set([
      "billing_month",
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
    ]);
    for (const k of Object.keys(body || {})) {
      if (allowKeys.has(k)) allowed[k] = body[k];
    }

    const hasWaterCalc = ["water_previous_reading", "water_current_reading", "water_unit_rate"].some((k) => k in allowed);
    const hasPowerCalc = ["power_previous_reading", "power_current_reading", "power_unit_rate"].some((k) => k in allowed);

    if (hasWaterCalc) {
      const prev = Number(allowed.water_previous_reading ?? 0);
      const curr = Number(allowed.water_current_reading ?? 0);
      const rate = Number(allowed.water_unit_rate ?? 0);
      const units = Math.max(0, curr - prev);
      allowed.water_amount = Number((units * rate).toFixed(2));
    }

    if (hasPowerCalc) {
      const prev = Number(allowed.power_previous_reading ?? 0);
      const curr = Number(allowed.power_current_reading ?? 0);
      const rate = Number(allowed.power_unit_rate ?? 0);
      const units = Math.max(0, curr - prev);
      allowed.power_amount = Number((units * rate).toFixed(2));
    }

    const supabase = createServerClient();

    const { data: oldBill } = await supabase.from("bills").select("*").eq("id", params.id).single();
    if (
      ["rent_amount", "water_amount", "power_amount", "internet_amount", "other_charges"].some((k) => k in allowed)
    ) {
      const current = { ...(oldBill || {}), ...allowed };
      const total =
        Number(current.rent_amount || 0) +
        Number(current.water_amount || 0) +
        Number(current.power_amount || 0) +
        Number(current.internet_amount || 0) +
        Number(current.other_charges || 0);
      allowed.total_amount = Number(total.toFixed(2));
    }

    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("bills")
      .update(allowed)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, bill: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const supabase = createServerClient();
    const billId = params.id;
    const body = await req.json().catch(() => ({}));
    const decision = (body?.decision ?? "").toLowerCase() as "approve" | "reject";
    const reason: string | undefined = body?.reason;

    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Use 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .select(`
        id, status, billing_month, due_date, contract_id,
        contracts!bills_contract_id_fkey (
          id, tenant_id
        )
      `)
      .eq("id", billId)
      .single();

    if (billErr) return NextResponse.json({ error: billErr.message }, { status: 400 });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    const tenantId: string | undefined = bill.contracts?.[0]?.tenant_id;
    const monthLabel = thMonth(bill.billing_month);

    const { data: slip, error: slipErr } = await supabase
      .from("payment_slips")
      .select("id, status")
      .eq("bill_id", billId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (slipErr) {
      console.error("Fetch slip error:", slipErr);
    }

    if (decision === "approve") {
      const { error: upBillErr } = await supabase
        .from("bills")
        .update({ status: "paid", paid_date: new Date().toISOString() })
        .eq("id", billId);

      if (upBillErr) return NextResponse.json({ error: upBillErr.message }, { status: 400 });

      if (slip?.id) {
        const { error: upSlipErr } = await supabase
          .from("payment_slips")
          .update({ status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null })
          .eq("id", slip.id);
        if (upSlipErr) console.error("Update slip error:", upSlipErr);
      }

      if (tenantId) {
        const { error: notiErr } = await supabase.from("notifications").insert([
          {
            user_id: tenantId,
            title: "บิลได้รับการยืนยันแล้ว",
            message: `บิลรอบเดือน ${monthLabel} ได้รับการยืนยันว่าชำระแล้ว ✅`,
            type: "bill",
            related_id: billId,
          },
        ]);
        if (notiErr) console.error("Insert notification error:", notiErr);
      }

      return NextResponse.json({ ok: true, newStatus: "paid" }, { status: 200 });
    }

    const { error: upBillErr } = await supabase
      .from("bills")
      .update({ status: "unpaid", paid_date: null })
      .eq("id", billId);

    if (upBillErr) return NextResponse.json({ error: upBillErr.message }, { status: 400 });

    if (slip?.id) {
      const { error: upSlipErr } = await supabase
        .from("payment_slips")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason ?? "ข้อมูลการโอนเงินไม่ถูกต้อง",
        })
        .eq("id", slip.id);
      if (upSlipErr) console.error("Update slip error:", upSlipErr);
    }

    if (tenantId) {
      const { error: notiErr } = await supabase.from("notifications").insert([
        {
          user_id: tenantId,
          title: "การชำระเงินถูกปฏิเสธ",
          message: `บิลรอบเดือน ${monthLabel} ถูกปฏิเสธ ❌ ${reason ? `เหตุผล: ${reason}` : ""}`.trim(),
          type: "bill",
          related_id: billId,
        },
      ]);
      if (notiErr) console.error("Insert notification error:", notiErr);
    }

    return NextResponse.json({ ok: true, newStatus: "unpaid" }, { status: 200 });
  } catch (e: any) {
    console.error("PATCH /api/admin/bills/[id] error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const supabase = createServerClient();
    const { error } = await supabase.from("bills").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
