import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/auth"

export async function GET() {
  try {
    const isAdmin = await getAdminSession()
    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error("Admin check error:", error)
    return NextResponse.json({ isAdmin: false })
  }
}
