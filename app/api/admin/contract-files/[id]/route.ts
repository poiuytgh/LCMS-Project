// app/api/admin/contract-files/[id]/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const id = params.id

    // 1) หา record เพื่อรู้ storage_path
    const { data: row, error: getErr } = await supabase
      .from("contract_files")
      .select("id, storage_path")
      .eq("id", id)
      .single()

    if (getErr) throw getErr
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 })

    // 2) ลบไฟล์ใน Storage
    const { error: rmErr } = await supabase.storage.from("contracts").remove([row.storage_path])
    if (rmErr) {
      // ถ้าลบไฟล์ไม่ได้ ให้แจ้งเตือน แต่ยังสามารถพยายามลบแถว DB ต่อไปก็ได้
      console.warn("remove storage error:", rmErr)
    }

    // 3) ลบแถวใน DB
    const { error: delErr } = await supabase.from("contract_files").delete().eq("id", id)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("DELETE contract-file error:", e)
    return NextResponse.json({ error: e?.message ?? "delete_failed" }, { status: 500 })
  }
}
