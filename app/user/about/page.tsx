"use client"

import { NavHome } from "@/components/nav-home"
import { FooterHome } from "@/components/footer-home"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavHome />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">เกี่ยวกับระบบ LCMS</h1>
        <p className="text-muted-foreground">ระบบจัดการสัญญาเช่าพื้นที่สำหรับผู้เช่าและผู้ดูแล</p>
      </main>
      <FooterHome />
    </div>
  )
}

