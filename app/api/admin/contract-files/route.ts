import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    const contractId = searchParams.get("contractId")

    let query = supabase
      .from("contract_files")
      .select(`
        id,
        contract_id,
        tenant_id,
        file_name,
        storage_path,
        mime_type,
        size_bytes,
        created_at,
        contracts (
          id,
          spaces ( name, code )
        ),
        profiles:tenant_id (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false })

    if (tenantId) query = query.eq("tenant_id", tenantId)
    if (contractId) query = query.eq("contract_id", contractId)

    const { data, error } = await query
    if (error) throw error

    const items = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const { data: signed, error: urlErr } = await supabase.storage
          .from("contracts")
          .createSignedUrl(row.storage_path, 60 * 60) // 1 ชม.
        if (urlErr) console.warn("signed url error:", urlErr)
        return { ...row, download_url: signed?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error("admin contract-files error:", e)
    return NextResponse.json({ error: e?.message ?? "fetch_failed" }, { status: 500 })
  }
}
