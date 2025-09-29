import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// DEV guard ด้วย SECRET (อย่าใช้ในโปรดักชัน)
function requireAdminAuth(req: Request): string | null {
  const got = req.headers.get("authorization");
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET ?? process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET}`;
  return got === need ? null : "Unauthorized";
}


export async function GET(req: Request) {
  try {
    const unauth = requireAdminAuth(req)
    if (unauth) return NextResponse.json({ error: unauth }, { status: 401 })

    const supabase = createServerClient()

    // เลือกเฉพาะสัญญาที่เกี่ยวกับการออกบิล (active + expiring)
    const { data, error } = await supabase
      .from("contracts")
      .select(`id, profiles!contracts_tenant_id_fkey ( first_name,last_name ), spaces ( name, code )`)
      .order("created_at", { ascending: false });


    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const contracts =
      (data || []).map((c: any) => {
        const p = c.profiles?.[0]
        const s = c.spaces?.[0]
        return {
          id: c.id as string,
          tenant_name: p ? `${p.first_name} ${p.last_name}` : "ไม่ระบุ",
          space_name: s?.name || "",
          space_code: s?.code || "",
        }
      }) || []

    return NextResponse.json({ contracts })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
