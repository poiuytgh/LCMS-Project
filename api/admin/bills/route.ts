import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * Admin auth helper (DEV only) — อย่าใช้ในโปรดักชัน
 * อนุญาตทั้ง ADMIN_SEED_SECRET และ NEXT_PUBLIC_ADMIN_SEED_SECRET
 * เพื่อให้ client ส่ง header ได้ง่ายตอน dev
 */
function requireAdminAuth(req: Request): string | null {
  const got = req.headers.get("authorization");
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET ?? process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET}`;
  return got === need ? null : "Unauthorized";
}

/**
 * GET /api/admin/bills
 * ดึงรายการบิลทั้งหมด + flatten tenant/space เพื่อให้หน้า admin/bills ใช้งานง่าย
 */
export async function GET(req: Request) {
  try {
    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bills")
      .select(`
        id, contract_id, billing_month,
        rent_amount, water_amount, power_amount, internet_amount, other_charges, total_amount,
        status, due_date, paid_date, created_at,
        contracts!inner (
          id,
          profiles!contracts_tenant_id_fkey ( first_name, last_name ),
          spaces ( name, code )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const bills =
      (data ?? []).map((b: any) => {
        const prof = b.contracts?.[0]?.profiles?.[0];
        const space = b.contracts?.[0]?.spaces?.[0];
        return {
          ...b,
          tenant_name: prof ? `${prof.first_name} ${prof.last_name}` : "",
          space_name: space?.name || "",
          space_code: space?.code || "",
        };
      });

    return NextResponse.json({ bills });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/**
 * POST /api/admin/bills
 * สร้างบิลใหม่ + คำนวณค่าน้ำ/ไฟและยอดรวม
 * หมายเหตุ: ค่า status ตั้งต้นเป็น "unpaid" (ให้ตรงกับหน้า UI คุณ)
 */
export async function POST(req: Request) {
  try {
    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const body = await req.json();
    const {
      contract_id,
      billing_month, // ควรเป็น YYYY-MM-01 (หรืออย่างน้อย Date string ที่ valid)
      rent_amount,
      water_previous_reading,
      water_current_reading,
      water_unit_rate,
      power_previous_reading,
      power_current_reading,
      power_unit_rate,
      internet_amount,
      other_charges,
      due_date, // YYYY-MM-DD
    } = body || {};

    // คำนวณหน่วยและจำนวนเงินค่าน้ำ/ไฟ
    const waterUnits = Math.max(0, Number(water_current_reading || 0) - Number(water_previous_reading || 0));
    const powerUnits = Math.max(0, Number(power_current_reading || 0) - Number(power_previous_reading || 0));
    const waterAmount = waterUnits * Number(water_unit_rate || 0);
    const powerAmount = powerUnits * Number(power_unit_rate || 0);

    // ยอดรวม
    const total =
      Number(rent_amount || 0) +
      Number(internet_amount || 0) +
      Number(other_charges || 0) +
      waterAmount +
      powerAmount;

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bills")
      .insert({
        contract_id,
        billing_month,
        rent_amount,
        water_previous_reading,
        water_current_reading,
        water_unit_rate,
        water_amount: waterAmount,
        power_previous_reading,
        power_current_reading,
        power_unit_rate,
        power_amount: powerAmount,
        internet_amount,
        other_charges,
        total_amount: total,
        due_date,
        status: "unpaid", // ให้ตรงกับหน้า UI (paid|pending|unpaid)
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, bill: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
