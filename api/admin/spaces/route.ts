import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

type Space = {
  id: string
  code: string
  name: string
  type: "office" | "retail" | "warehouse" | "residential"
  description: string | null
  status: "available" | "occupied" | "maintenance"
  created_at: string
  updated_at: string
}

// ✅ helper: guard ด้วย ADMIN_SEED_SECRET (เร็ว/ตรงไปตรงมา)
function requireAdminAuth(req: Request): string | null {
  const auth = req.headers.get("authorization")
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  return auth === need ? null : "Unauthorized"
}

// ========== GET /api/admin/spaces ==========
export async function GET(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ spaces: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// ========== POST /api/admin/spaces ==========
export async function POST(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const body = await req.json()
    const payload = {
      code: String(body?.code || "").trim(),
      name: String(body?.name || "").trim(),
      type: (body?.type || "office") as Space["type"],
      description: body?.description ? String(body.description) : null,
      status: (body?.status || "available") as Space["status"],
    }

    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "code and name are required" }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("spaces")
      .insert(payload)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ space: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// ========== PATCH /api/admin/spaces?id=<spaceId> ==========
export async function PATCH(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const body = await req.json()
    const update: Partial<Omit<Space, "id" | "created_at" | "updated_at">> = {}
    if (body.code !== undefined) update.code = String(body.code)
    if (body.name !== undefined) update.name = String(body.name)
    if (body.type !== undefined) update.type = body.type
    if (body.description !== undefined) update.description = body.description ?? null
    if (body.status !== undefined) update.status = body.status

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("spaces")
      .update(update)
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ space: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// ========== DELETE /api/admin/spaces?id=<spaceId> ==========
export async function DELETE(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const supabase = createServerClient()
    const { error } = await supabase.from("spaces").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
