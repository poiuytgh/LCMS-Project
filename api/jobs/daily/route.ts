import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Update contract statuses
    await updateContractStatuses(supabase)

    // Generate notifications for expiring contracts
    await generateExpiringContractNotifications(supabase)

    // Generate notifications for overdue bills
    await generateOverdueBillNotifications(supabase)

    return NextResponse.json({ success: true, message: "Daily jobs completed" })
  } catch (error) {
    console.error("Daily jobs error:", error)
    return NextResponse.json({ error: "Failed to run daily jobs" }, { status: 500 })
  }
}

async function updateContractStatuses(supabase: any) {
  // Mark contracts as expiring (30 days before end date)
  await supabase
    .from("contracts")
    .update({ status: "expiring" })
    .eq("status", "active")
    .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    .gt("end_date", new Date().toISOString())

  // Mark contracts as expired
  await supabase
    .from("contracts")
    .update({ status: "expired" })
    .in("status", ["active", "expiring"])
    .lt("end_date", new Date().toISOString())
}

async function generateExpiringContractNotifications(supabase: any) {
  // Get contracts expiring in 30 days
  const { data: expiringContracts } = await supabase
    .from("contracts")
    .select(`
      id,
      tenant_id,
      end_date,
      spaces (name)
    `)
    .eq("status", "expiring")
    .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())

  if (expiringContracts) {
    for (const contract of expiringContracts) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", contract.tenant_id)
        .eq("type", "contract")
        .eq("related_id", contract.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (!existingNotification?.length) {
        await supabase.from("notifications").insert({
          user_id: contract.tenant_id,
          title: "สัญญาเช่าใกล้หมดอายุ",
          message: `สัญญาเช่า ${contract.spaces?.name} จะหมดอายุในวันที่ ${new Date(contract.end_date).toLocaleDateString("th-TH")}`,
          type: "contract",
          related_id: contract.id,
        })
      }
    }
  }
}

async function generateOverdueBillNotifications(supabase: any) {
  // Get overdue bills
  const { data: overdueBills } = await supabase
    .from("bills")
    .select(`
      id,
      total_amount,
      due_date,
      contracts (
        tenant_id,
        spaces (name)
      )
    `)
    .eq("status", "unpaid")
    .lt("due_date", new Date().toISOString())

  if (overdueBills) {
    for (const bill of overdueBills) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", bill.contracts.tenant_id)
        .eq("type", "bill")
        .eq("related_id", bill.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (!existingNotification?.length) {
        await supabase.from("notifications").insert({
          user_id: bill.contracts.tenant_id,
          title: "บิลค่าเช่าเกินกำหนดชำระ",
          message: `บิลค่าเช่า ${bill.contracts.spaces?.name} จำนวน ${new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(bill.total_amount)} เกินกำหนดชำระแล้ว`,
          type: "bill",
          related_id: bill.id,
        })
      }
    }
  }
}
