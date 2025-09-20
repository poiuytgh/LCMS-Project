import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials, setAdminSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบให้ครบถ้วน" },
        { status: 400 },
      )
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        {
          error:
            "ยังไม่ได้ตั้งค่า ADMIN_EMAIL/ADMIN_PASSWORD ใน .env.local กรุณาเพิ่มค่าและรีสตาร์ทเซิร์ฟเวอร์",
        },
        { status: 500 },
      )
    }

    const isValidAdmin = await verifyAdminCredentials(email, password)

    if (!isValidAdmin) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      )
    }

    // ตั้งค่า session cookie
    await setAdminSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบผู้ดูแลระบบ" },
      { status: 500 },
    )
  }
}
