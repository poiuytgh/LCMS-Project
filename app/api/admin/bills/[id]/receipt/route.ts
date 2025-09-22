import { createServerClient } from "@/lib/supabase"
import PDFDocument from "pdfkit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function requireAdminAuth(req: Request): string | null {
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  const got = req.headers.get("authorization")
  return got === need ? null : "Unauthorized"
}

function thb(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0))
}
function thDate(s?: string | null) {
  if (!s) return "-"
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return new Response(JSON.stringify({ error: unauth }), { status: 401 })

    const supabase = createServerClient()
    const billId = params.id

    // pull bill + contract + tenant + space
    const { data: bill, error } = await supabase
      .from("bills")
      .select(`
        id, billing_month, rent_amount,
        water_previous_reading, water_current_reading, water_unit_rate, water_amount,
        power_previous_reading, power_current_reading, power_unit_rate, power_amount,
        internet_amount, other_charges, total_amount,
        status, due_date, paid_date, created_at,
        contracts!bills_contract_id_fkey (
          id,
          profiles!contracts_tenant_id_fkey ( first_name, last_name ),
          spaces ( name, code )
        )
      `)
      .eq("id", billId)
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    if (!bill) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })

      if (bill.status !== "paid") {
        return new Response(
          JSON.stringify({ error: "บิลนี้ยังไม่ได้ชำระเงิน" }),
          { status: 400 }
        )
      }

    const contract = bill.contracts?.[0]
    const profile = contract?.profiles?.[0]
    const space = contract?.spaces?.[0]

    const tenantName = profile ? `${profile.first_name} ${profile.last_name}` : "ไม่ระบุ"
    const spaceLabel = `${space?.name || ""}${space?.code ? ` (${space.code})` : ""}`
    const monthLabel = thDate(bill.billing_month)

    // --- build PDF ---
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 })

      const chunks: Buffer[] = []
      doc.on("data", (d: Buffer) => chunks.push(d))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Header
      doc.fontSize(18).text("ใบเสร็จรับเงิน (Receipt)", { align: "center" })
      doc.moveDown(0.5)
      doc.fontSize(11).text(`Receipt No: RC-${bill.id.slice(0, 8).toUpperCase()}`)
      doc.text(`วันที่ออกใบเสร็จ: ${thDate(new Date().toISOString())}`)
      doc.moveDown()

      // Tenant & Space
      doc.fontSize(12).text(`ผู้เช่า: ${tenantName}`)
      doc.text(`พื้นที่: ${spaceLabel}`)
      doc.text(`รอบบิล: ${monthLabel}`)
      doc.text(`กำหนดชำระ: ${thDate(bill.due_date)}`)
      doc.text(`สถานะบิล: ${bill.status === "paid" ? "ชำระแล้ว" : bill.status}`)
      if (bill.paid_date) doc.text(`วันที่ชำระ: ${thDate(bill.paid_date)}`)
      doc.moveDown()

      // Table-like
      const items: Array<{ label: string; value: number | string }> = [
        { label: "ค่าเช่าพื้นที่", value: thb(bill.rent_amount) },
        {
          label: `ค่าน้ำ (มิเตอร์ ${bill.water_previous_reading} → ${bill.water_current_reading}, อัตรา ${thb(bill.water_unit_rate)}/หน่วย)`,
          value: thb(bill.water_amount),
        },
        {
          label: `ค่าไฟ (มิเตอร์ ${bill.power_previous_reading} → ${bill.power_current_reading}, อัตรา ${thb(bill.power_unit_rate)}/หน่วย)`,
          value: thb(bill.power_amount),
        },
        { label: "อินเทอร์เน็ต", value: thb(bill.internet_amount) },
        { label: "ค่าใช้จ่ายอื่น ๆ", value: thb(bill.other_charges) },
      ]

      doc.fontSize(12)
      items.forEach((row) => {
        doc.text(row.label, { continued: true }).text(`  ${row.value}`, { align: "right" })
      })
      doc.moveDown(0.5)
      doc.fontSize(13).text("รวมทั้งสิ้น:", { continued: true }).text(`  ${thb(bill.total_amount)}`, { align: "right" })

      doc.moveDown(1.2)
      doc.fontSize(10).fillColor("#666").text("เอกสารนี้จัดทำโดยระบบอัตโนมัติของ LCMS", { align: "center" })
      doc.end()
    })

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${billId}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 })
  }
}
