import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const billId = searchParams.get("billId")

    if (!billId) {
      return NextResponse.json({ error: "Bill ID is required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Fetch bill details
    const { data: bill, error } = await supabase
      .from("bills")
      .select(
        `
        *,
        contracts (
          *,
          profiles (
            first_name,
            last_name
          ),
          spaces (
            name,
            code
          )
        )
      `,
      )
      .eq("id", billId)
      .single()

    if (error || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    if (bill.status !== "paid") {
      return NextResponse.json({ error: "Bill is not paid" }, { status: 400 })
    }

    // Generate PDF receipt (simplified version)
    const receiptData = {
      billId: bill.id,
      tenantName: `${bill.contracts.profiles.first_name} ${bill.contracts.profiles.last_name}`,
      spaceName: bill.contracts.spaces.name,
      spaceCode: bill.contracts.spaces.code,
      billingMonth: bill.billing_month,
      totalAmount: bill.total_amount,
      paidDate: bill.paid_date,
      receiptNumber: `RCP-${bill.id.slice(-8).toUpperCase()}`,
    }

    // In a real implementation, you would use a PDF library like pdf-lib or pdfmake
    // For now, return the receipt data as JSON
    return NextResponse.json({
      message: "Receipt generated successfully",
      receiptData,
      downloadUrl: `/api/pdf/receipt/download?billId=${billId}`,
    })
  } catch (error) {
    console.error("Receipt generation error:", error)
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 })
  }
}
