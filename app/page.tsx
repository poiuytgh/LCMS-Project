"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NavHome } from "@/components/nav-home"
import { FooterHome } from "@/components/footer-home"
import { Building2, FileText, CreditCard, HeadphonesIcon, Shield, Clock, CheckCircle2, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <NavHome />

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-24 px-4"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), url('/images/hero-bg.jpg')",
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
            {user ? (
              <>
                <div className="inline-flex items-center justify-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-2 sm:mb-0">
                  <CheckCircle2 className="h-4 w-4 text-green-300" />
                  <span className="text-sm">คุณได้เข้าสู่ระบบแล้ว</span>
                </div>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-3">
                  <Link href="/dashboard" aria-label="ไปแดชบอร์ด">
                    <LayoutDashboard className="h-5 w-5 mr-2" /> ไปแดชบอร์ด
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-3">
                  <Link href="/login" aria-label="เข้าสู่ระบบ">
                    เข้าสู่ระบบ
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3 bg-white/10 border-white text-white hover:bg-white hover:text-foreground"
                >
                  <Link href="/register">สมัครสมาชิก</Link>
                </Button>
              </>
            )}
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
                <CardDescription>
                  สร้าง/ต่ออายุ/สิ้นสุดสัญญา ติดตามวันหมดอายุ และผูกกับพื้นที่ได้อย่างชัดเจน
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>บิลค่าเช่าอัตโนมัติ</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  สร้างบิลรายเดือนรวมค่าน้ำ/ไฟ/อินเทอร์เน็ต ออกรายงานและใบเสร็จ PDF ได้
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <HeadphonesIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>ศูนย์ช่วยเหลือ</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ส่งคำร้อง แจ้งปัญหา และติดตามสถานะการแก้ไขได้แบบเรียลไทม์
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>ปลอดภัย</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  จัดเก็บข้อมูลอย่างปลอดภัยด้วยนโยบายเข้าถึงตามบทบาทและการยืนยันตัวตน
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>บริหารพื้นที่</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  จัดการสถานะพื้นที่ ว่าง/ใช้งาน/ซ่อมบำรุง พร้อมรายละเอียดและประเภทพื้นที่
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>แจ้งเตือนทันเวลา</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  เตือนกำหนดชำระ ค่าสาธารณูปโภค และสัญญาที่ใกล้หมดอายุ
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">เริ่มใช้งานระบบจัดการสัญญาเช่าได้เลย</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            สร้างบัญชีใหม่หรือเข้าสู่ระบบเพื่อจัดการพื้นที่และสัญญาของคุณ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button asChild size="lg" className="text-lg px-8 py-3 bg-white text-primary hover:bg-gray-100">
                <Link href="/dashboard">ไปแดชบอร์ด</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
                  <Link href="/register">สมัครสมาชิก</Link>
                </Button>
                <Button asChild size="lg" className="text-lg px-8 py-3 bg-white text-primary hover:bg-gray-100">
                  <Link href="/login">เข้าสู่ระบบ</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <FooterHome />
    </div>
  )
}
