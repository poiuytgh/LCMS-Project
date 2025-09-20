import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// POST /api/admin/seed-users
// Body: { users: [{ email, password?, first_name, last_name, phone?, avatar_url? }, ...], secret: string }
export async function POST(req: Request) {
  try {
    const { users, secret } = await req.json()

    if (!secret || secret !== process.env.ADMIN_SEED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "users must be a non-empty array" }, { status: 400 })
    }

    const supabase = createServerClient()

    const results: Array<{ email: string; status: string; userId?: string; error?: string }> = []

    for (const u of users) {
      const { email, password, first_name, last_name, phone, avatar_url } = u || {}
      if (!email || !first_name || !last_name) {
        results.push({ email: email || "", status: "skipped", error: "missing required fields" })
        continue
      }
      // Try create user via admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: password || Math.random().toString(36).slice(2) + "Aa#1",
        email_confirm: true,
        user_metadata: { first_name, last_name, phone, avatar_url },
      })

      if (error) {
        // Try to find existing user then upsert profile
        try {
          let page = 1
          const perPage = 1000
          let foundId: string | null = null
          while (true) {
            const list = await supabase.auth.admin.listUsers({ page, perPage })
            const hit = list.data?.users?.find(
              (x) => (x.email || "").toLowerCase() === email.toLowerCase()
            )
            if (hit) {
              foundId = hit.id
              break
            }
            if (!list.data || list.data.users.length < perPage) break
            page += 1
          }

          if (foundId) {
            const { error: upsertErr } = await supabase.from("profiles").upsert(
              {
                id: foundId,
                first_name,
                last_name,
                phone: phone ?? null,
                avatar_url: avatar_url ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            )
            if (upsertErr) {
              results.push({ email, status: "error", error: upsertErr.message })
            } else {
              results.push({ email, status: "updated", userId: foundId })
            }
          } else {
            results.push({ email, status: "error", error: error.message })
          }
        } catch (e: any) {
          results.push({ email, status: "error", error: e?.message || String(e) })
        }
      } else {
        const userId = data?.user?.id
        if (userId) {
          // Ensure profile exists
          const { error: upsertErr } = await supabase.from("profiles").upsert(
            {
              id: userId,
              first_name,
              last_name,
              phone: phone ?? null,
              avatar_url: avatar_url ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          if (upsertErr) {
            results.push({ email, status: "created_profile_error", userId, error: upsertErr.message })
          } else {
            results.push({ email, status: "created", userId })
          }
        } else {
          results.push({ email, status: "created_no_id" })
        }
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
