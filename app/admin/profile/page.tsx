"use client";

import { useEffect, useRef, useState } from "react";
import { NavAdmin } from "@/components/nav-admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, Save, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

const LS_NAME = "admin:name";
const LS_AVATAR = "admin:avatar";

function getInitials(name?: string) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminProfilePage() {
  const [name, setName] = useState("ผู้ดูแลระบบ");
  const [email] = useState("admin@example.com"); // แสดงอย่างเดียว
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // โหลดค่าที่เคยบันทึกไว้
  useEffect(() => {
    const savedName = typeof window !== "undefined" ? localStorage.getItem(LS_NAME) : null;
    const savedAvatar = typeof window !== "undefined" ? localStorage.getItem(LS_AVATAR) : null;
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(LS_NAME, name);
      // แจ้งให้ nav-admin รีเฟรช
      window.dispatchEvent(new Event("admin-profile-updated"));
      await new Promise((r) => setTimeout(r, 500));
      toast.success("บันทึกข้อมูลโปรไฟล์สำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ขนาดไฟล์เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(LS_AVATAR, dataUrl);
      // แจ้งให้ nav-admin รีเฟรช
      window.dispatchEvent(new Event("admin-profile-updated"));
      toast.success("อัปเดตรูปโปรไฟล์แล้ว");
    };
    reader.readAsDataURL(file);
    // ล้างค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (!avatar) return;
    setAvatar(null);
    localStorage.removeItem(LS_AVATAR);
    window.dispatchEvent(new Event("admin-profile-updated"));
    toast.success("ลบรูปโปรไฟล์แล้ว");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">โปรไฟล์ผู้ดูแลระบบ</h1>
            <p className="text-muted-foreground">
              จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีผู้ดูแล
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  รูปโปรไฟล์
                </CardTitle>
                <CardDescription>รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4 ring-1 ring-border">
                  <AvatarImage
                    key={avatar || "no-avatar"} // รีเฟรชทันทีเมื่อรูปเปลี่ยน
                    src={avatar || undefined}
                    alt="Admin Avatar"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    <Shield className="h-12 w-12 hidden" />
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={handlePickImage}>
                    <Camera className="h-4 w-4 mr-2" />
                    เปลี่ยนรูปภาพ
                  </Button>
                  {/* แสดงปุ่มลบตลอด แต่ปิดการใช้งานเมื่อไม่มีรูป */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={!avatar}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบรูปภาพ
                  </Button>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  hidden
                />
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="กรอกชื่อ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" value={email} disabled />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
