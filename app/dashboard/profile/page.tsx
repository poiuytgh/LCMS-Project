"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { NavUser } from "@/components/nav-user";
import {
  User as UserIcon,
  Camera,
  Trash2,
  Mail,
  Phone,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/components/auth-provider";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null; // public URL หรือ object path (ขึ้นกับ BUCKET_PUBLIC)
  email?: string | null;
};

/* ===== ตั้งค่าถังรูป ===== */
const AVATAR_BUCKET = "avatars";
/** true = เก็บ public URL, false = เก็บ object path (private bucket ต้อง signed URL) */
const BUCKET_PUBLIC = true;

/** event ภายในแท็บ ใช้แจ้ง NavUser ให้ refresh */
const PROFILE_AVATAR_UPDATED_EVENT = "profile:avatar-updated";

export default function ProfilePage() {
  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // โหลดโปรไฟล์
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const ins = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              first_name: user.user_metadata?.first_name ?? null,
              last_name: user.user_metadata?.last_name ?? null,
              phone: null,
              avatar_url: null,
              email: user.email ?? null,
            })
            .select("*")
            .maybeSingle();
          if (ins.error) throw ins.error;
          setProfile(ins.data as Profile);
        } else {
          setProfile(data as Profile);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, supabase]);

  // ถ้าเป็น private bucket -> ขอ signed URL
  useEffect(() => {
    if (BUCKET_PUBLIC) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      if (!profile?.avatar_url) {
        setSignedUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(profile.avatar_url, 60 * 60); // 1 ชม.
      if (error) {
        console.error(error);
        setSignedUrl(null);
      } else {
        setSignedUrl(data.signedUrl);
      }
    })();
  }, [profile?.avatar_url, supabase]);

  const initials = (first?: string | null, last?: string | null) =>
    `${(first?.[0] ?? "U")}${(last?.[0] ?? "")}`.toUpperCase();

  const displayAvatarSrc = useMemo(() => {
    if (!profile?.avatar_url) return "";
    return BUCKET_PUBLIC ? profile.avatar_url : signedUrl ?? "";
  }, [profile?.avatar_url, signedUrl]);

  const onPickFile = () => fileInputRef.current?.click();

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("อนุญาตเฉพาะไฟล์ JPG/PNG เท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const objectPath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (uploadErr) throw uploadErr;

      let valueToStore: string | null = null;

      if (BUCKET_PUBLIC) {
        const { data: pub } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(objectPath);
        valueToStore = pub.publicUrl ?? null;
      } else {
        valueToStore = objectPath; // เก็บ path
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: valueToStore })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setProfile((p) => (p ? { ...p, avatar_url: valueToStore } : p));
      // แจ้ง NavUser ให้รีเฟรชทันที (ไม่ต้องรอโหลดใหม่/Realtime)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
            detail: valueToStore,
          })
        );
      }

      toast.success("อัปโหลดรูปโปรไฟล์สำเร็จ");
    } catch (err) {
      console.error("Upload avatar error:", err);
      toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setUploading(true);
    try {
      let storagePath: string | null = null;

      if (BUCKET_PUBLIC) {
        // https://<proj>.supabase.co/storage/v1/object/public/avatars/<path>
        const url = new URL(profile.avatar_url);
        const needle = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
        const i = url.pathname.indexOf(needle);
        if (i >= 0) storagePath = url.pathname.slice(i + needle.length);
      } else {
        storagePath = profile.avatar_url; // already path
      }

      if (storagePath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
      setSignedUrl(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: null })
        );
      }

      toast.success("ลบรูปโปรไฟล์แล้ว");
    } catch (err) {
      console.error("Delete avatar error:", err);
      toast.error("ลบรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>กำลังโหลดข้อมูลโปรไฟล์...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavUser />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">โปรไฟล์</h1>
            <p className="text-muted-foreground">
              จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* รูปโปรไฟล์ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  รูปโปรไฟล์
                </CardTitle>
                <CardDescription>อัปโหลด/ลบรูปได้เท่านั้น</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  {/* ใส่ key เพื่อบังคับรีเฟรชรูปเมื่อ URL เปลี่ยน */}
                  <AvatarImage key={displayAvatarSrc} src={displayAvatarSrc} />
                  <AvatarFallback className="text-2xl">
                    {initials(profile?.first_name, profile?.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPickFile}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    เปลี่ยนรูปภาพ
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteAvatar}
                    disabled={uploading || !profile?.avatar_url}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบรูป
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.currentTarget.value = "";
                  }}
                />

                <p className="text-xs text-muted-foreground mt-2">
                  รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB
                </p>
              </CardContent>
            </Card>

            {/* ข้อมูลส่วนตัว (อ่านอย่างเดียว) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                <CardDescription>ฟิลด์ทั้งหมดเป็นแบบอ่านอย่างเดียว</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">ชื่อ</Label>
                    <Input id="firstName" value={profile?.first_name ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">นามสกุล</Label>
                    <Input id="lastName" value={profile?.last_name ?? ""} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={user?.email || ""} disabled />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      อีเมลไม่สามารถเปลี่ยนแปลงได้ หากต้องการเปลี่ยน กรุณาติดต่อผู้ดูแลระบบ
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input id="phone" value={profile?.phone ?? ""} disabled />
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  หากต้องการแก้ไขชื่อ/นามสกุล/เบอร์โทร กรุณาติดต่อผู้ดูแลระบบ
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ความปลอดภัย */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>การรักษาความปลอดภัย</CardTitle>
              <CardDescription>ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start gap-3">
              <Input value={user?.email || ""} disabled className="max-w-sm" />
              <Button
                onClick={async () => {
                  if (!user?.email) return;
                  try {
                    const origin =
                      typeof window !== "undefined" ? window.location.origin : "";
                    const { error } = await supabase.auth.resetPasswordForEmail(
                      user.email,
                      { redirectTo: `${origin}/update-password` }
                    );
                    if (error) throw error;
                    toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
                  } catch (err) {
                    console.error(err);
                    toast.error("ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ");
                  }
                }}
              >
                ส่งลิงก์รีเซ็ตรหัสผ่าน
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
