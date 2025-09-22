import { createServerClient } from "@/lib/supabase"

function requireAdminAuth(req: Request): string | null {
  const need = `Bearer ${process.env.ADMIN_SEED_SECRET}`
  const got = req.headers.get("authorization")
  return got === need ? null : "Unauthorized"
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const unauth = requireAdminAuth(req)
  if (unauth) return new Response(JSON.stringify({ error: unauth }), { status: 401 })

  const supabase = createServerClient()
  try {
    const { data: slip, error } = await supabase
      .from("payment_slips")
      .select("file_url")
      .eq("id", params.id)
      .maybeSingle()
    if (error) throw error
    if (!slip) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })

    const { data: signed, error: e2 } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(slip.file_url, 60 * 5) // 5 นาที
    if (e2) throw e2

    return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200 })
  } catch (e: any) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 })
  }
}
