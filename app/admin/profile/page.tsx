"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavAdmin } from "@/components/nav-admin"
import { User, Camera, Save, Key, Shield } from "lucide-react"
import { toast } from "sonner"

export default function AdminProfilePage() {
  const [formData, setFormData] = useState({
    name: "ผู้ดูแลระบบ",
    email: process.env.ADMIN_EMAIL || "admin@example.com",
  })
  const [saving, setSaving] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // In a real implementation, you would save admin profile data
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      toast.success("บันทึกข้อมูลโปรไฟล์สำเร็จ")
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">โปรไฟล์ผู้ดูแลระบบ</h1>
            <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีผู้ดูแล</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  รูปโปรไฟล์
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    <Shield className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  เปลี่ยนรูปภาพ
                </Button>
                <p className="text-xs text-muted-foreground mt-2">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
              </CardContent>
            </Card>

            {/* Profile Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                <CardDescription>อัปเดตข้อมูลส่วนตัวของผู้ดูแลระบบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อ</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="กรอกชื่อ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">อีเมลผู้ดูแลถูกกำหนดใน Environment Variables</p>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Security Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                การรักษาความปลอดภัย
              </CardTitle>
              <CardDescription>จัดการรหัสผ่านและการตั้งค่าความปลอดภัยสำหรับผู้ดูแล</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">รหัสผ่านผู้ดูแล</h4>
                    <p className="text-sm text-muted-foreground">เปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบผู้ดูแล</p>
                  </div>
                  <Button variant="outline">เปลี่ยนรหัสผ่าน</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">การเข้าถึงระบบ</h4>
                    <p className="text-sm text-muted-foreground">ตรวจสอบและจัดการการเข้าถึงระบบ</p>
                  </div>
                  <Button variant="outline">ดูประวัติการเข้าสู่ระบบ</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">การสำรองข้อมูล</h4>
                    <p className="text-sm text-muted-foreground">สำรองและกู้คืนข้อมูลระบบ</p>
                  </div>
                  <Button variant="outline">จัดการการสำรองข้อมูล</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
