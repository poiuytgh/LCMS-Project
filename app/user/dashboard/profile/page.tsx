"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavUser } from "@/components/nav-user";
import { User as UserIcon, Camera, Trash2, Mail, Phone, Save } from "lucide-react"; // ⬅️ ตัด RotateCcw ออก
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/components/auth-provider";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email?: string | null;
};

const AVATAR_BUCKET = "avatars";
const BUCKET_PUBLIC = true;

const PROFILE_AVATAR_UPDATED_EVENT = "profile:avatar-updated";
const PROFILE_INFO_UPDATED_EVENT = "profile:info-updated";

export default function ProfilePage() {
  const supabase = createClientComponentClient();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // avatar
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // editable fields
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (error) throw error;

        let prof: Profile | null = (data as Profile) ?? null;

        if (!prof) {
          const ins = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              first_name: user.user_metadata?.first_name ?? null,
              last_name: user.user_metadata?.last_name ?? null,
              phone: user.user_metadata?.phone ?? null,
              avatar_url: null,
              email: user.email ?? null,
            })
            .select("*")
            .maybeSingle();
          if (ins.error) throw ins.error;
          prof = ins.data as Profile;
        }

        setProfile(prof);
        setFirst(prof?.first_name ?? "");
        setLast(prof?.last_name ?? "");
        setPhone(prof?.phone ?? "");
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, supabase]);

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
      const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatar_url, 60 * 60);
      if (error) setSignedUrl(null);
      else setSignedUrl(data.signedUrl);
    })();
  }, [profile?.avatar_url, supabase]);

  const initials = (f?: string | null, l?: string | null) => `${(f?.[0] ?? "U")}${(l?.[0] ?? "")}`.toUpperCase();

  const displayAvatarSrc = useMemo(() => {
    if (!profile?.avatar_url) return "";
    return BUCKET_PUBLIC ? profile.avatar_url : signedUrl ?? "";
  }, [profile?.avatar_url, signedUrl]);

  const onPickFile = () => fileInputRef.current?.click();

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) return toast.error("อนุญาตเฉพาะไฟล์ JPG/PNG เท่านั้น");
    if (file.size > 2 * 1024 * 1024) return toast.error("ขนาดไฟล์ต้องไม่เกิน 2MB");

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const objectPath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from(AVATAR_BUCKET).upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (uploadErr) throw uploadErr;

      let valueToStore: string | null = null;
      if (BUCKET_PUBLIC) {
        const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
        valueToStore = pub.publicUrl ?? null;
      } else {
        valueToStore = objectPath;
      }

      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: valueToStore }).eq("id", user.id);
      if (updErr) throw updErr;

      setProfile((p) => (p ? { ...p, avatar_url: valueToStore } : p));
      window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: valueToStore }));
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
        const url = new URL(profile.avatar_url);
        const needle = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
        const i = url.pathname.indexOf(needle);
        if (i >= 0) storagePath = url.pathname.slice(i + needle.length);
      } else storagePath = profile.avatar_url;

      if (storagePath) await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);

      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (updErr) throw updErr;

      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
      setSignedUrl(null);
      window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: null }));
      toast.success("ลบรูปโปรไฟล์แล้ว");
    } catch (err) {
      console.error("Delete avatar error:", err);
      toast.error("ลบรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const saveInfo = async () => {
    if (!user) return;
    const f = first.trim();
    const l = last.trim();
    const p = phone.trim();

    setSavingInfo(true);
    try {
      const { error: err1 } = await supabase
        .from("profiles")
        .update({ first_name: f || null, last_name: l || null, phone: p || null })
        .eq("id", user.id);
      if (err1) throw err1;

      const displayName = [f, l].filter(Boolean).join(" ").trim();
      const { error: err2 } = await supabase.auth.updateUser({
        data: {
          first_name: f || null,
          last_name: l || null,
          phone: p || null,
          name: displayName || null,
          full_name: displayName || null,
          display_name: displayName || null,
        },
      });
      if (err2) throw err2;

      setProfile((prev) =>
        prev ? { ...prev, first_name: f || null, last_name: l || null, phone: p || null } : prev
      );

      window.dispatchEvent(
        new CustomEvent(PROFILE_INFO_UPDATED_EVENT, { detail: { first_name: f, last_name: l, phone: p } })
      );

      toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อย");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSavingInfo(false);
    }
  };

  const sendReset = async () => {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${origin}/update-password`,
      });
      if (error) throw error;
      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ");
    } finally {
      setSendingReset(false);
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
            <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar */}
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
                  <AvatarImage key={displayAvatarSrc} src={displayAvatarSrc} className="object-cover" />
                  <AvatarFallback className="text-2xl">
                    {initials(profile?.first_name, profile?.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
                    <Camera className="h-4 w-4 mr-2" />
                    เปลี่ยนรูปภาพ
                  </Button>
                  <Button variant="destructive" size="sm" onClick={deleteAvatar} disabled={uploading || !profile?.avatar_url}>
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

                <p className="text-xs text-muted-foreground mt-2">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
              </CardContent>
            </Card>

            {/* Editable info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                <CardDescription>แก้ไขชื่อ-นามสกุล และเบอร์โทรของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">ชื่อ</Label>
                    <Input id="firstName" value={first} onChange={(e) => setFirst(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">นามสกุล</Label>
                    <Input id="lastName" value={last} onChange={(e) => setLast(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={user?.email || ""} disabled />
                    </div>
                  </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                    </div>
                  </div>
                </div>

                {/* ปุ่มบันทึก: เต็มความกว้างบนมือถือ / อัตโนมัติบนจอใหญ่ */}
                <div className="mt-2">
                  <Button onClick={saveInfo} disabled={savingInfo} className="w-full md:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {savingInfo ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>การรักษาความปลอดภัย</CardTitle>
              <CardDescription>ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start gap-3">
              <Input value={user?.email || ""} disabled className="max-w-sm" />
              <Button onClick={sendReset} disabled={sendingReset}>
                {sendingReset ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
