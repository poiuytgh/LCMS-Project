import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";

/** อนุญาตด้วย cookie admin_session เป็นหลัก; ยอมรับ Bearer token เป็น fallback (demo) */
function isAuthorizedAdmin(): boolean {
  // 1) ตรวจจากคุกกี้ (ทางเลือก B)
  const jar = cookies();
  if (jar.get("admin_session")?.value === "true") return true;

  // 2) เผื่อกรณีเรียกทดสอบด้วย Bearer token
  const auth = headers().get("authorization") || "";
  const need1 = `Bearer ${process.env.ADMIN_SEED_SECRET ?? ""}`;
  const need2 = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET ?? ""}`;
  if (auth === need1 || auth === need2) return true;

  return false;
}

export async function GET() {
  try {
    if (!isAuthorizedAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // ===== ดึงข้อมูลหลักแบบขนาน =====
    const now = new Date();
    const firstOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    )
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

    const [
      { data: contracts, error: contractsErr },
      { data: spaces, error: spacesErr },
      { data: bills, error: billsErr },
      { data: tickets, error: ticketsErr },
    ] = await Promise.all([
      supabase.from("contracts").select("id,status,end_date"),
      supabase.from("spaces").select("id,status"),
      supabase
        .from("bills")
        .select("id,status,total_amount,due_date,billing_month")
        .gte("billing_month", firstOfMonth),
      supabase.from("support_tickets").select("status,created_at"),
    ]);

    if (contractsErr) throw contractsErr;
    if (spacesErr) throw spacesErr;
    if (billsErr) throw billsErr;
    if (ticketsErr) throw ticketsErr;

    // ===== สรุปสถิติ =====
    const contractStats = {
      total: contracts?.length ?? 0,
      active: contracts?.filter((c) => c.status === "active").length ?? 0,
      expiring: contracts?.filter((c) => c.status === "expiring").length ?? 0,
      expired: contracts?.filter((c) => c.status === "expired").length ?? 0,
    };

    const spaceStats = {
      total: spaces?.length ?? 0,
      available: spaces?.filter((s) => s.status === "available").length ?? 0,
      occupied: spaces?.filter((s) => s.status === "occupied").length ?? 0,
      maintenance: spaces?.filter((s) => s.status === "maintenance").length ?? 0,
    };

    const financeStats = {
      monthlyRevenue:
        bills?.reduce(
          (sum, b) => sum + (b.status === "paid" ? Number(b.total_amount) : 0),
          0
        ) ?? 0,
      paid: bills?.filter((b) => b.status === "paid").length ?? 0,
      unpaid: bills?.filter((b) => b.status === "unpaid").length ?? 0,
      pending: bills?.filter((b) => b.status === "pending").length ?? 0,
    };

    const supportStats = {
      total: tickets?.length ?? 0,
      new: tickets?.filter((t) => t.status === "new").length ?? 0,
      needInfo: tickets?.filter((t) => t.status === "need_info").length ?? 0,
      overdue:
        tickets?.filter((t) => {
          const days =
            Math.floor(
              (Date.now() - new Date(t.created_at).getTime()) / 86400000
            );
          return ["new", "acknowledged"].includes(t.status as string) && days > 3;
        }).length ?? 0,
    };

    // ===== รายการสัญญาใกล้หมดอายุ (5 อันดับ) =====
    const { data: expiringData, error: expErr } = await supabase
      .from("contracts")
      .select(
        `
        id,
        end_date,
        tenant:profiles!contracts_tenant_id_fkey(first_name,last_name),
        space:spaces(name)
      `
      )
      .eq("status", "expiring")
      .order("end_date", { ascending: true })
      .limit(5);

    if (expErr) throw expErr;

    const expiringContracts =
      expiringData?.map((c: any) => ({
        id: c.id,
        tenant_name: c?.tenant
          ? `${c.tenant.first_name ?? ""} ${c.tenant.last_name ?? ""}`
              .trim() || "ไม่ระบุ"
          : "ไม่ระบุ",
        space_name: c?.space?.name ?? "ไม่ระบุ",
        end_date: c.end_date,
      })) ?? [];

    // ===== รายการบิลค้างชำระ (5 อันดับ) =====
    const { data: overdueData, error: overErr } = await supabase
      .from("bills")
      .select(
        `
        id,
        total_amount,
        due_date,
        contracts!bills_contract_id_fkey(
          tenant:profiles!contracts_tenant_id_fkey(first_name,last_name),
          space:spaces(name)
        )
      `
      )
      .eq("status", "unpaid")
      .lt("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5);

    if (overErr) throw overErr;

    const overdueBills =
      overdueData?.map((b: any) => ({
        id: b.id,
        tenant_name: b?.contracts?.tenant
          ? `${b.contracts.tenant.first_name ?? ""} ${b.contracts.tenant.last_name ?? ""}`
              .trim() || "ไม่ระบุ"
          : "ไม่ระบุ",
        space_name: b?.contracts?.space?.name ?? "ไม่ระบุ",
        total_amount: Number(b.total_amount),
        due_date: b.due_date,
      })) ?? [];

    return NextResponse.json(
      {
        contracts: contractStats,
        spaces: spaceStats,
        finance: financeStats,
        support: supportStats,
        expiringContracts,
        overdueBills,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("admin dashboard summary error:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
