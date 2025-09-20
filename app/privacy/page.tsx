"use client"

import { NavHome } from "@/components/nav-home"
import { FooterHome } from "@/components/footer-home"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavHome />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted-foreground">เราดูแลข้อมูลของคุณอย่างปลอดภัยและเคารพสิทธิส่วนบุคคล</p>
      </main>
      <FooterHome />
    </div>
  )
}

