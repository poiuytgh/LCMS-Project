import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: "Invalid notification IDs" }, { status: 400 })
    }

    const supabase = createServerClient()

    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", notificationIds)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark notifications as read error:", error)
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}
