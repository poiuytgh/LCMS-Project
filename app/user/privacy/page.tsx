"use client"

import Link from "next/link"
import { NavHome } from "@/components/nav-home"
import { FooterHome } from "@/components/footer-home"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <NavHome />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white border rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            นโยบายความเป็นส่วนตัว
          </h1>

          <p className="mb-4 text-gray-700 text-center">
            เราดูแลข้อมูลของคุณอย่างปลอดภัยและเคารพสิทธิความเป็นส่วนตัว
            กรุณาอ่านรายละเอียดนโยบายดังต่อไปนี้
          </p>

          <div className="space-y-4 text-gray-700">
            <div>
              <h2 className="text-lg font-semibold mb-1">1. การเก็บข้อมูล</h2>
              <p>
                ระบบจะเก็บข้อมูลส่วนบุคคลที่จำเป็น เช่น ชื่อ อีเมล เบอร์โทรศัพท์
                และข้อมูลการเช่า เพื่อให้บริการได้อย่างถูกต้อง
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-1">2. การใช้งานข้อมูล</h2>
              <p>
                ข้อมูลที่เก็บรวบรวมจะถูกนำไปใช้เพื่อการติดต่อสื่อสาร
                การยืนยันตัวตน และการปรับปรุงการให้บริการ
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-1">3. การรักษาความปลอดภัย</h2>
              <p>
                ระบบใช้มาตรการด้านเทคนิคและการจัดการเพื่อปกป้องข้อมูลของคุณ
                ไม่ให้ถูกเข้าถึงโดยไม่ได้รับอนุญาต
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-1">4. สิทธิของผู้ใช้งาน</h2>
              <p>
                ผู้ใช้งานสามารถร้องขอการแก้ไข ลบ หรืออัปเดตข้อมูลส่วนบุคคลได้
                โดยติดต่อผู้ดูแลระบบ
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="px-6 py-2 bg-[#004c6d] text-white font-medium rounded hover:bg-[#00394f] transition-colors"
            >
              กลับไปหน้าสมัครสมาชิก
            </Link>
          </div>
        </div>
      </main>

      <FooterHome />
    </div>
  )
}
