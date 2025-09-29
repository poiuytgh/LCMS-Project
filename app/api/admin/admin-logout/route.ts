import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";

export async function POST() {
  try {
    await clearAdminSession(); // clear cookie admin_session
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin logout error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการออกจากระบบ" }, { status: 500 });
  }
}
