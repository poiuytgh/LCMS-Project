import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, bucket } = await request.json()

    if (!fileName || !fileType || !bucket) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Generate signed upload URL
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(fileName)

    if (error) {
      console.error("Error creating signed upload URL:", error)
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    })
  } catch (error) {
    console.error("Sign upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
