"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NavHome } from "@/components/nav-home"
import { FooterHome } from "@/components/footer-home"
import { Building2, FileText, CreditCard, HeadphonesIcon, Shield, Clock } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavHome />

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-24 px-4"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/images/hero-bg.jpg')",
        }}
      >
        <div className="container mx-auto text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            ระบบสัญญาเช่าพื้นที่
            <br />
            <span className="text-accent">LCMS</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-pretty max-w-3xl mx-auto">
            จัดการสัญญาเช่า บิลค่าเช่า และเอกสารต่างๆ ได้อย่างง่ายดายและปลอดภัย
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-3">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-3 bg-white/10 border-white text-white hover:bg-white hover:text-foreground"
            >
              <Link href="/register">สมัครสมาชิก</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">ฟีเจอร์หลัก</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ระบบครบครันสำหรับการจัดการสัญญาเช่าพื้นที่อย่างมืออาชีพ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>จัดการสัญญาเช่า</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>ดูรายละเอียดสัญญา ดาวน์โหลดเอกสาร และติดตามสถานะสัญญาได้ตลอดเวลา</CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>บิลค่าเช่า</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>ตรวจสอบบิลรายเดือน อัปโหลดสลิปการชำระเงิน และดาวน์โหลดใบเสร็จ</CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <HeadphonesIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>แจ้งปัญหา</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>แจ้งปัญหาการใช้งานเว็บไซต์ และติดตามสถานะการแก้ไขแบบเรียลไทม์</CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>ความปลอดภัย</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>ระบบรักษาความปลอดภัยระดับสูง เข้ารหัสข้อมูลและเอกสารทั้งหมด</CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>แจ้งเตือนอัตโนมัติ</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>รับการแจ้งเตือนเมื่อมีบิลใหม่ สัญญาใกล้หมดอายุ หรือมีการอัปเดต</CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>จัดการพื้นที่</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>ดูข้อมูลพื้นที่เช่า รายละเอียดห้อง และสถานะการใช้งานแบบครบถ้วน</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">พร้อมเริ่มต้นแล้วหรือยัง?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            เข้าร่วมกับเราวันนี้และสัมผัสประสบการณ์การจัดการสัญญาเช่าที่ง่ายและมีประสิทธิภาพ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
              <Link href="/register">สมัครสมาชิกฟรี</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary bg-transparent"
            >
              <Link href="/role">เลือกประเภทผู้ใช้</Link>
            </Button>
          </div>
        </div>
      </section>

      <FooterHome />
    </div>
  )
}
