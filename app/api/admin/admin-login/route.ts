import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminCredentials, setAdminSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // ยอมรับ ADMIN_PASSWORD หรือ ADMIN_PASSWORD_HASH (ถ้าคุณทำภายหลัง)
    if (!process.env.ADMIN_EMAIL || (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH)) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า ADMIN_EMAIL และ ADMIN_PASSWORD/ADMIN_PASSWORD_HASH ใน .env.local" },
        { status: 500 }
      );
    }

    const ok = await verifyAdminCredentials(email, password);
    if (!ok) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    await setAdminSession(); // set cookie admin_session=true
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบผู้ดูแลระบบ" },
      { status: 500 }
    );
  }
}
