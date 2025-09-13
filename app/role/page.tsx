"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NavHome } from "@/components/nav-home"
import { Users, Shield } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

export default function RoleSelectionPage() {
  const [isLoading, setIsLoading] = useState({ user: false, admin: false })
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleUserRole = async () => {
    setIsLoading((prev) => ({ ...prev, user: true }))

    try {
      if (user) {
        // User is already logged in, redirect to dashboard
        router.push("/dashboard")
      } else {
        // Redirect to user login
        router.push("/login")
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
      setIsLoading((prev) => ({ ...prev, user: false }))
    }
  }

  const handleAdminRole = async () => {
    setIsLoading((prev) => ({ ...prev, admin: true }))

    try {
      // Check if admin session exists
      const response = await fetch("/api/admin-check")
      const data = await response.json()

      if (data.isAdmin) {
        // Admin is already logged in, redirect to admin dashboard
        router.push("/admin")
      } else {
        // Redirect to admin login
        router.push("/login/admin")
      }
    } catch (error) {
      // If API fails, redirect to admin login
      router.push("/login/admin")
    } finally {
      setIsLoading((prev) => ({ ...prev, admin: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavHome />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลด...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavHome />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">เลือกประเภทผู้ใช้</h1>
            <p className="text-lg text-muted-foreground">กรุณาเลือกประเภทผู้ใช้เพื่อเข้าสู่ระบบที่เหมาะสม</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User Role Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">ผู้เช่า</CardTitle>
                <CardDescription className="text-base">สำหรับผู้ใช้ทั่วไปที่ต้องการจัดการสัญญาเช่าและบิลค่าเช่า</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>ดูและจัดการสัญญาเช่าของตนเอง</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>ตรวจสอบและชำระบิลค่าเช่า</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>แจ้งปัญหาการใช้งานเว็บไซต์</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>รับการแจ้งเตือนอัตโนมัติ</span>
                  </div>
                </div>
                <Button
                  onClick={handleUserRole}
                  className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
                  disabled={isLoading.user}
                >
                  {isLoading.user ? "กำลังดำเนินการ..." : "เข้าสู่ระบบผู้เช่า"}
                </Button>
              </CardContent>
            </Card>

            {/* Admin Role Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group border-accent/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Shield className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">ผู้ดูแลระบบ</CardTitle>
                <CardDescription className="text-base">สำหรับผู้ดูแลระบบที่ต้องการจัดการข้อมูลทั้งหมด</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    <span>จัดการสัญญาเช่าและพื้นที่ทั้งหมด</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    <span>อนุมัติการชำระเงินและออกใบเสร็จ</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    <span>จัดการปัญหาและตอบกลับผู้ใช้</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                    <span>ดูรายงานและสถิติการใช้งาน</span>
                  </div>
                </div>
                <Button
                  onClick={handleAdminRole}
                  className="w-full bg-accent hover:bg-accent/90 text-lg py-6"
                  disabled={isLoading.admin}
                >
                  {isLoading.admin ? "กำลังดำเนินการ..." : "เข้าสู่ระบบผู้ดูแล"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              หากคุณไม่แน่ใจว่าควรเลือกประเภทใด กรุณา{" "}
              <a href="/contact" className="text-primary hover:underline">
                ติดต่อผู้ดูแลระบบ
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
