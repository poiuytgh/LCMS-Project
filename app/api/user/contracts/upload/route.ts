import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { randomUUID } from "crypto"

export const runtime = "nodejs"

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"]
const MAX_SIZE_MB = 15

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "")
    .replace(/-+/g, "-")
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()

    const form = await req.formData()
    const file = form.get("file") as File | null
    const tenantId = (form.get("tenantId") as string) || ""
    const contractId = (form.get("contractId") as string) || null

    if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 })
    if (!tenantId) return NextResponse.json({ error: "no_tenant" }, { status: 400 })

    const mime = file.type || "application/octet-stream"
    const size = file.size || 0
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json({ error: "unsupported_type" }, { status: 415 })
    }
    if (size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 })
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase()
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "file"
    const objectName = `${tenantId}/${randomUUID()}-${base}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadErr } = await supabase.storage
      .from("contracts")
      .upload(objectName, Buffer.from(arrayBuffer), {
        contentType: mime,
        upsert: false,
      })
    if (uploadErr) throw uploadErr

    const { error: insertErr } = await supabase.from("contract_files").insert({
      contract_id: contractId,
      tenant_id: tenantId,
      file_name: file.name,
      storage_path: objectName,
      mime_type: mime,
      size_bytes: size,
    })
    if (insertErr) throw insertErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("upload error:", e)
    return NextResponse.json({ error: e?.message ?? "upload_failed" }, { status: 500 })
  }
}
