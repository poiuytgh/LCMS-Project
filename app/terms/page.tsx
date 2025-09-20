"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white border rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          เงื่อนไขการใช้งาน
        </h1>

        <p className="mb-4 text-gray-700 text-center">
          ยินดีต้อนรับสู่ <span className="font-semibold">ระบบสัญญาเช่าพื้นที่</span><br />
          กรุณาอ่านเงื่อนไขการใช้งานต่อไปนี้ก่อนดำเนินการสมัครสมาชิก
        </p>

        <div className="space-y-4 text-gray-700">
          <div>
            <h2 className="text-lg font-semibold mb-1">1. การสมัครสมาชิก</h2>
            <p>ผู้ใช้งานต้องกรอกข้อมูลที่ถูกต้องและเป็นความจริงในขั้นตอนการสมัคร และต้องรับผิดชอบต่อบัญชีของตนเอง</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">2. การใช้งานระบบ</h2>
            <p>ห้ามใช้ระบบในทางที่ผิดกฎหมาย ผิดศีลธรรม หรือสร้างความเสียหายแก่ผู้อื่น</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">3. การจัดเก็บข้อมูล</h2>
            <p>ระบบจะจัดเก็บข้อมูลส่วนบุคคลตามที่จำเป็นเพื่อการให้บริการ และปฏิบัติตามนโยบายความเป็นส่วนตัว</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">4. การแก้ไขเงื่อนไข</h2>
            <p>เงื่อนไขการใช้งานอาจถูกแก้ไขได้ตามความเหมาะสม โดยจะแจ้งให้ผู้ใช้งานทราบล่วงหน้า</p>
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
    </div>
  )
}
