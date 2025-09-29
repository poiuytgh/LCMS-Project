import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { randomUUID } from "crypto";

type SeedUser = {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
};

type ResultRow = {
  email: string;
  status: string;
  userId?: string;
  error?: string;
};

function makeResult(row: { email: string; status: string; userId?: string | null; error?: string }): ResultRow {
  const out: ResultRow = { email: row.email, status: row.status };
  if (typeof row.userId === "string") out.userId = row.userId;
  if (row.error) out.error = row.error;
  return out;
}

// รองรับ SECRET ทั้งฝั่ง server และ public (สำหรับ dev เท่านั้น)
function requireAdminAuth(req: Request): string | null {
  const got = req.headers.get("authorization");
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET ?? process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET}`;
  return got === need ? null : "Unauthorized";
}

// ค้นหา user จากอีเมลด้วย listUsers (admin API ต้องใช้ service role key)
async function findUserIdByEmail(supabase: ReturnType<typeof createServerClient>, email: string): Promise<string | null> {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const list = await supabase.auth.admin.listUsers({ page, perPage });
    const users = list.data?.users ?? [];
    const hit = users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // (ทางเลือก) บล็อค production
    // if (process.env.NODE_ENV === "production") {
    //   return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
    // }

    const unauth = requireAdminAuth(req);
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 });

    const body = await req
      .json()
      .catch(() => null) as { users?: SeedUser[] } | null;

    const users: SeedUser[] | undefined = body?.users;
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "users must be a non-empty array" }, { status: 400 });
    }

    // สำคัญ: createServerClient ในโปรเจกต์ของคุณต้องใช้ SERVICE_ROLE
    // ไม่งั้น supabase.auth.admin.* จะ 403
    const supabase = createServerClient();

    const results: ResultRow[] = [];

    for (const u of users) {
      const { email, password, first_name, last_name, phone, avatar_url } = u || {};

      if (!email || !first_name || !last_name) {
        results.push(makeResult({ email: email || "", status: "skipped", error: "missing required fields" }));
        continue;
      }

      // 1) พยายามสร้าง user ก่อน
      const generatedPassword = password || `${randomUUID()}Aa#1`;
      const { data, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { first_name, last_name, phone, avatar_url },
      });

      if (createErr) {
        // 2) ถ้าสร้างไม่สำเร็จ (เช่น email ซ้ำ) → หา user เดิมด้วย listUsers
        try {
          const foundId = await findUserIdByEmail(supabase, email);
          if (!foundId) {
            results.push(makeResult({ email, status: "error", error: createErr.message }));
            continue;
          }

          // upsert โปรไฟล์ของ user เดิม
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
          );

          if (upsertErr) {
            results.push(makeResult({ email, status: "error", userId: foundId, error: upsertErr.message }));
          } else {
            results.push(makeResult({ email, status: "updated", userId: foundId }));
          }
        } catch (e: any) {
          results.push(makeResult({ email, status: "error", error: e?.message || String(e) }));
        }
        continue;
      }

      // 3) ถ้าสร้างสำเร็จ → upsert โปรไฟล์
      const userId = data?.user?.id || null;
      if (!userId) {
        results.push(makeResult({ email, status: "created_no_id" }));
        continue;
      }

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
      );

      if (upsertErr) {
        results.push(makeResult({ email, status: "created_profile_error", userId, error: upsertErr.message }));
      } else {
        results.push(makeResult({ email, status: "created", userId }));
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
