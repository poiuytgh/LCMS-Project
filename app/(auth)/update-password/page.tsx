"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function UpdatePasswordPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const hash = window.location.hash
        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.slice(1))
          const access_token = params.get("access_token")
          const refresh_token = params.get("refresh_token")
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
            history.replaceState(null, "", window.location.pathname + window.location.search)
          }
        }
      } finally {
        setBusy(false)
      }
    })()
  }, [supabase.auth])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร")
      return
    }
    if (password !== confirm) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน")
      return
    }

    setSaving(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        toast.error("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาขอใหม่อีกครั้ง")
        return
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      await supabase.auth.signOut()

      toast.success("อัปเดตรหัสผ่านสำเร็จ")
      router.replace("/login")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? "อัปเดตรหัสผ่านไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  if (busy) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
        กำลังตรวจสอบลิงก์...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription>ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">รหัสผ่านใหม่</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpw">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="cpw"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
