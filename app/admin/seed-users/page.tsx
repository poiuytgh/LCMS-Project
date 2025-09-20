"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type SeedResult = { email: string; status: string; userId?: string; error?: string }

export default function AdminSeedUsersPage() {
  const [secret, setSecret] = useState("")
  const [jsonText, setJsonText] = useState(`[
  { "email": "admin@example.com", "password": "Admin#12345", "first_name": "Admin", "last_name": "User" },
  { "email": "tenant1@example.com", "first_name": "Tenant", "last_name": "One" }
]`)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<SeedResult[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async () => {
    setErrorMsg(null)
    setResults(null)
    let users: any
    try {
      users = JSON.parse(jsonText)
      if (!Array.isArray(users) || users.length === 0) {
        setErrorMsg("JSON ต้องเป็นอาร์เรย์ของผู้ใช้อย่างน้อย 1 รายการ")
        return
      }
    } catch (e: any) {
      setErrorMsg("JSON ไม่ถูกต้อง: " + (e?.message || String(e)))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/seed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, users }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data?.error || "เกิดข้อผิดพลาดในการเรียก API")
        return
      }
      setResults(data.results as SeedResult[])
    } catch (e: any) {
      setErrorMsg(e?.message || String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Seed ผู้ใช้ (Admin)</CardTitle>
          <CardDescription>อัปผู้ใช้เป็นชุดไปยัง Supabase Auth และโปรไฟล์</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ADMIN_SEED_SECRET</label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ใส่ค่าเดียวกับ ADMIN_SEED_SECRET ใน .env"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Users JSON</label>
            <Textarea
              className="min-h-48"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "กำลังส่ง..." : "ส่ง Seed"}
          </Button>

          {errorMsg && (
            <div className="text-sm text-red-600">{errorMsg}</div>
          )}

          {results && (
            <div className="mt-4 space-y-1">
              <div className="text-sm font-medium">ผลลัพธ์:</div>
              <ul className="text-sm list-disc pl-5">
                {results.map((r, i) => (
                  <li key={i}>
                    {r.email} → {r.status}
                    {r.userId ? ` (${r.userId})` : ""}
                    {r.error ? `: ${r.error}` : ""}
                  </li>)
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

