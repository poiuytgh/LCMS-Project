import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const auth = req.headers.get("authorization")
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  return auth === need ? null : "Unauthorized"
}

export async function GET(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()

    // ---------- Contracts ----------
    const { data: contracts } = await supabase.from("contracts").select("id,status,end_date")
    const contractStats = {
      total: contracts?.length || 0,
      active: contracts?.filter((c) => c.status === "active").length || 0,
      expiring: contracts?.filter((c) => c.status === "expiring").length || 0,
      expired: contracts?.filter((c) => c.status === "expired").length || 0,
    }

    // ---------- Spaces ----------
    const { data: spaces } = await supabase.from("spaces").select("id,status")
    const spaceStats = {
      total: spaces?.length || 0,
      available: spaces?.filter((s) => s.status === "available").length || 0,
      occupied: spaces?.filter((s) => s.status === "occupied").length || 0,
      maintenance: spaces?.filter((s) => s.status === "maintenance").length || 0,
    }

    // ---------- Finance (current month) ----------
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01"
    const { data: bills } = await supabase
      .from("bills")
      .select("id,status,total_amount,due_date,billing_month")
      .gte("billing_month", currentMonth)

    const financeStats = {
      monthlyRevenue:
        bills?.reduce((sum, b) => sum + (b.status === "paid" ? Number(b.total_amount) : 0), 0) || 0,
      paid: bills?.filter((b) => b.status === "paid").length || 0,
      unpaid: bills?.filter((b) => b.status === "unpaid").length || 0,
      pending: bills?.filter((b) => b.status === "pending").length || 0,
    }

    // ---------- Support ----------
    const { data: tickets } = await supabase.from("support_tickets").select("status,created_at")
    const supportStats = {
      total: tickets?.length || 0,
      new: tickets?.filter((t) => t.status === "new").length || 0,
      needInfo: tickets?.filter((t) => t.status === "need_info").length || 0,
      overdue:
        tickets?.filter((t) => {
          const days = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)
          return ["new", "acknowledged"].includes(t.status) && days > 3
        }).length || 0,
    }

    // ---------- Expiring Contracts (top 5) ----------
    const { data: expiringData } = await supabase
      .from("contracts")
      .select(`
        id,
        end_date,
        profiles!contracts_tenant_id_fkey (
          first_name,
          last_name
        ),
        spaces (
          name
        )
      `)
      .eq("status", "expiring")
      .order("end_date", { ascending: true })
      .limit(5)

    const expiringContracts =
      expiringData?.map((c: any) => ({
        id: c.id,
        tenant_name: c?.profiles?.[0] ? `${c.profiles[0].first_name} ${c.profiles[0].last_name}` : "ไม่ระบุ",
        space_name: c?.spaces?.[0]?.name || "ไม่ระบุ",
        end_date: c.end_date,
      })) || []

    // ---------- Overdue Bills (top 5) ----------
    const { data: overdueData } = await supabase
      .from("bills")
      .select(`
        id,
        total_amount,
        due_date,
        contracts!bills_contract_id_fkey (
          profiles!contracts_tenant_id_fkey (
            first_name,
            last_name
          ),
          spaces (
            name
          )
        )
      `)
      .eq("status", "unpaid")
      .lt("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5)

    const overdueBills =
      overdueData?.map((b: any) => {
        const contract = b.contracts?.[0]
        const profile = contract?.profiles?.[0]
        const space = contract?.spaces?.[0]
        return {
          id: b.id,
          tenant_name: profile ? `${profile.first_name} ${profile.last_name}` : "ไม่ระบุ",
          space_name: space?.name || "ไม่ระบุ",
          total_amount: Number(b.total_amount),
          due_date: b.due_date,
        }
      }) || []

    return NextResponse.json({
      contracts: contractStats,
      spaces: spaceStats,
      finance: financeStats,
      support: supportStats,
      expiringContracts,
      overdueBills,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
