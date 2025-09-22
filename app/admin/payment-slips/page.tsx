"use client"

import { useEffect, useMemo, useState } from "react"
import { NavAdmin } from "@/components/nav-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Eye, Check, X, Search, Filter } from "lucide-react"

type SlipRow = {
  id: string
  bill_id: string
  file_name: string
  file_url: string
  notes: string | null
  status: "pending" | "approved" | "rejected" | string
  created_at: string
  rejection_reason?: string | null
  // joined
  bill_status?: string
  bill_paid_date?: string | null
  bill_billing_month?: string
  bill_total_amount?: number
  tenant_name?: string
  space_name?: string
  space_code?: string
}

const ADMIN_HDR = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET ?? ""}` }

export default function AdminPaymentSlipsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SlipRow[]>([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  useEffect(() => { fetchList() }, [])

  const fetchList = async () => {
    try {
      setLoading(true)
      const url = new URL("/api/admin/payment-slips", window.location.origin)
      if (q.trim()) url.searchParams.set("q", q.trim())
      if (status !== "all") url.searchParams.set("status", status)
      const res = await fetch(url.toString(), { headers: ADMIN_HDR, cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "โหลดรายการสลิปไม่สำเร็จ")
      setRows(json.slips || [])
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => rows, [rows])

  const formatMonth = (s?: string) =>
    s ? new Date(s).toLocaleDateString("th-TH", { month: "long", year: "numeric" }) : "-"
  const formatCurrency = (n?: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0))
  const formatDateTime = (s?: string) =>
    s ? new Date(s).toLocaleString("th-TH") : "-"

  const badge = (st: string) => {
    switch (st) {
      case "approved": return <Badge className="bg-green-100 text-green-800">อนุมัติแล้ว</Badge>
      case "pending":  return <Badge className="bg-yellow-100 text-yellow-800">รอตรวจสอบ</Badge>
      case "rejected": return <Badge className="bg-red-100 text-red-800">ปฏิเสธ</Badge>
      default:         return <Badge variant="secondary">{st}</Badge>
    }
  }

  const openPreview = async (id: string) => {
    try {
      setPreviewId(id)
      setPreviewUrl(null)
      const res = await fetch(`/api/admin/payment-slips/${id}/signed-url`, { headers: ADMIN_HDR })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "สร้างลิงก์รูปไม่สำเร็จ")
      setPreviewUrl(json.url)
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
      setPreviewId(null)
    }
  }

  const approve = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/payment-slips/${id}/approve`, { method: "POST", headers: ADMIN_HDR })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "อนุมัติไม่สำเร็จ")
      toast.success("อนุมัติสลิปแล้ว")
      fetchList()
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    }
  }

  const reject = async () => {
    if (!rejectId) return
    try {
      const res = await fetch(`/api/admin/payment-slips/${rejectId}/reject`, {
        method: "POST",
        headers: { ...ADMIN_HDR, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "ปฏิเสธไม่สำเร็จ")
      toast.success("ปฏิเสธสลิปแล้ว")
      setRejectId(null)
      setReason("")
      fetchList()
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">สลิปการชำระเงิน</h1>
              <p className="text-muted-foreground">ตรวจสอบ อนุมัติ/ปฏิเสธ สลิปที่ผู้ใช้อัปโหลด</p>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="ค้นหาผู้เช่า/พื้นที่/ชื่อไฟล์..."
                  value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                    <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                    <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchList}>รีเฟรช</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(filtered || []).map((r) => (
              <Card key={r.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{r.tenant_name || "ไม่ทราบผู้เช่า"}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {r.space_name} ({r.space_code}) · {formatMonth(r.bill_billing_month)}
                    </p>
                  </div>
                  {badge(r.status)}
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">ชื่อไฟล์</div>
                    <div className="truncate">{r.file_name}</div>
                    <div className="text-muted-foreground">บิล</div>
                    <div>{formatCurrency(r.bill_total_amount)}</div>
                    <div className="text-muted-foreground">อัปโหลด</div>
                    <div>{formatDateTime(r.created_at)}</div>
                    {r.status === "rejected" && (
                      <>
                        <div className="text-muted-foreground">เหตุผลปฏิเสธ</div>
                        <div className="text-red-600">{r.rejection_reason || "-"}</div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Dialog open={previewId === r.id} onOpenChange={(o) => !o && setPreviewId(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1" onClick={() => openPreview(r.id)}>
                          <Eye className="h-4 w-4 mr-1" /> ดูสลิป
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>รูปสลิป</DialogTitle></DialogHeader>
                        {previewUrl ? (
                          <img src={previewUrl} alt="slip" className="rounded-md w-full" />
                        ) : (
                          <div className="h-64 flex items-center justify-center text-muted-foreground">
                            กำลังโหลดรูป...
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {r.status !== "approved" && (
                      <Button className="flex-1" onClick={() => approve(r.id)}>
                        <Check className="h-4 w-4 mr-1" /> อนุมัติ
                      </Button>
                    )}

                    {r.status !== "rejected" && (
                      <Dialog open={rejectId === r.id} onOpenChange={(o) => !o && setRejectId(null)}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="flex-1" onClick={() => setRejectId(r.id)}>
                            <X className="h-4 w-4 mr-1" /> ปฏิเสธ
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>ระบุเหตุผลการปฏิเสธ</DialogTitle></DialogHeader>
                          <textarea
                            className="w-full rounded-md border p-2 text-sm"
                            rows={5}
                            placeholder="เหตุผล (ถ้ามี)"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setRejectId(null)}>ยกเลิก</Button>
                            <Button variant="destructive" onClick={reject}>ยืนยันปฏิเสธ</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!loading && (!filtered || filtered.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="py-16 text-center text-muted-foreground">
                  ไม่พบสลิปตามเงื่อนไขค้นหา/ตัวกรอง
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
