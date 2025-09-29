import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const isAdmin = await getAdminSession();
    return NextResponse.json({ isAdmin });
  } catch (err) {
    console.error("Admin check error:", err);
    return NextResponse.json({ isAdmin: false });
  }
}
