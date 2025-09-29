"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NavUser } from "@/components/nav-user"
import { CreditCard, Upload, Download, Eye, Search, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Bill {
  id: string
  contract: {
    id: string
    space?: {
      name?: string
      code?: string
    }
  } | null
  billing_month: string
  rent_amount: number
  water_previous_reading: number
  water_current_reading: number
  water_unit_rate: number
  water_amount: number
  power_previous_reading: number
  power_current_reading: number
  power_unit_rate: number
  power_amount: number
  internet_amount: number
  other_charges: number
  total_amount: number
  status: "paid" | "pending" | "unpaid" | string
  due_date: string
  paid_date: string | null
  created_at: string
}

export default function BillsPage() {
  const { user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [filteredBills, setFilteredBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  // ควบคุม dialog อัปโหลด (เก็บ billId ที่กำลังเปิด)
  const [openUpload, setOpenUpload] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchBills()
    }
  }, [user?.id])

  useEffect(() => {
    filterBills()
  }, [bills, searchTerm, statusFilter])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("bills")
        .select(
          `
          id,
          billing_month,
          rent_amount,
          water_previous_reading,
          water_current_reading,
          water_unit_rate,
          water_amount,
          power_previous_reading,
          power_current_reading,
          power_unit_rate,
          power_amount,
          internet_amount,
          other_charges,
          total_amount,
          status,
          due_date,
          paid_date,
          created_at,
          contract:contracts!inner (
            id,
            tenant_id,
            space:spaces (
              name,
              code
            )
          )
        `
        )
        // กรองตามผู้เช่า
        .eq("contract.tenant_id", user!.id)
        .order("billing_month", { ascending: false })

      if (error) throw error

      // ทำให้โครงสร้างสม่ำเสมอ รองรับกรณี lib คืน array/object
      const normalized: Bill[] = (data || []).map((b: any) => {
        const contractRaw = Array.isArray(b.contract) ? b.contract[0] : b.contract
        const spaceRaw = contractRaw?.space
        const space = Array.isArray(spaceRaw) ? spaceRaw[0] : spaceRaw
        return {
          ...b,
          contract: contractRaw ? { id: contractRaw.id, space } : null,
        }
      })

      setBills(normalized)
    } catch (err) {
      console.error("Error fetching bills:", err)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล")
    } finally {
      setLoading(false)
    }
  }

  const filterBills = () => {
    let filtered = bills

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase()
      filtered = filtered.filter((bill) => {
        const spaceName = bill.contract?.space?.name?.toLowerCase() ?? ""
        const spaceCode = bill.contract?.space?.code?.toLowerCase() ?? ""
        const monthStr = new Date(bill.billing_month)
          .toLocaleDateString("th-TH", { month: "long", year: "numeric" })
          .toLowerCase()
        return spaceName.includes(s) || spaceCode.includes(s) || monthStr.includes(s)
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.status === statusFilter)
    }

    setFilteredBills(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">ชำระแล้ว</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">รอตรวจสอบ</Badge>
      case "unpaid":
        return <Badge className="bg-red-100 text-red-800">ยังไม่ชำระ</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount)

  const formatMonth = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })

  const isOverdue = (dueDate: string, status: string) => status === "unpaid" && new Date(dueDate) < new Date()

  const openReceipt = async (billId: string) => {
    const { data: sess } = await supabase.auth.getSession()
    const accessToken = sess.session?.access_token
    const base = `/api/user/bills/${billId}/receipt`
    const url = accessToken ? `${base}?t=${encodeURIComponent(accessToken)}` : base
    window.open(url, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูลบิล...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavUser />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">บิลค่าเช่า</h1>
            <p className="text-muted-foreground">ตรวจสอบและจัดการบิลค่าเช่ารายเดือน</p>
          </div>

          {/* Search & Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาตามชื่อพื้นที่ รหัสพื้นที่ หรือเดือน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="กรองตามสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="unpaid">ยังไม่ชำระ</SelectItem>
                      <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                      <SelectItem value="paid">ชำระแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bills List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <Card
                  key={bill.id}
                  className={`hover:shadow-lg transition-shadow ${
                    isOverdue(bill.due_date, bill.status) ? "border-red-200 bg-red-50/50" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">บิลเดือน {formatMonth(bill.billing_month)}</CardTitle>
                        <CardDescription className="mt-1">
                          {bill.contract?.space?.name} ({bill.contract?.space?.code})
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(bill.status)}
                        {isOverdue(bill.due_date, bill.status) && (
                          <Badge variant="destructive" className="mt-1 block">
                            เกินกำหนด
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ค่าเช่า:</span>
                          <p className="font-medium">{formatCurrency(bill.rent_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ค่าน้ำ:</span>
                          <p className="font-medium">{formatCurrency(bill.water_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ค่าไฟ:</span>
                          <p className="font-medium">{formatCurrency(bill.power_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ค่าอินเทอร์เน็ต:</span>
                          <p className="font-medium">{formatCurrency(bill.internet_amount)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">ยอดรวม:</span>
                          <span className="text-xl font-bold text-primary">{formatCurrency(bill.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>กำหนดชำระ:</span>
                          <span className={isOverdue(bill.due_date, bill.status) ? "text-red-600 font-medium" : ""}>
                            {formatDate(bill.due_date)}
                          </span>
                        </div>
                        {bill.paid_date && (
                          <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>วันที่ชำระ:</span>
                            <span>{formatDate(bill.paid_date)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-4">
                        {/* View detail */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-transparent"
                              onClick={() => setSelectedBill(bill)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              ดูรายละเอียด
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>รายละเอียดบิลเดือน {formatMonth(bill.billing_month)}</DialogTitle>
                              <DialogDescription>
                                {bill.contract?.space?.name} ({bill.contract?.space?.code})
                              </DialogDescription>
                            </DialogHeader>
                            <BillDetailView bill={bill} />
                          </DialogContent>
                        </Dialog>

                        {/* Upload slip (controlled) */}
                        {bill.status === "unpaid" && (
                          <Dialog open={openUpload === bill.id} onOpenChange={(o) => setOpenUpload(o ? bill.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="flex-1">
                                <Upload className="h-4 w-4 mr-1" />
                                อัปโหลดสลิป
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>อัปโหลดสลิปการชำระเงิน</DialogTitle>
                                <DialogDescription>
                                  อัปโหลดสลิปสำหรับบิลเดือน {formatMonth(bill.billing_month)}
                                </DialogDescription>
                              </DialogHeader>
                              <PaymentSlipUpload
                                billId={bill.id}
                                onSuccess={fetchBills}
                                onDone={() => setOpenUpload(null)}
                              />
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Download receipt after paid */}
                        {bill.status === "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => openReceipt(bill.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            ดาวน์โหลดใบเสร็จ
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบบิลค่าเช่า</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all"
                      ? "ไม่พบบิลที่ตรงกับเงื่อนไขการค้นหา"
                      : "คุณยังไม่มีบิลค่าเช่าในระบบ"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Bill detail ---------- */
function BillDetailView({ bill }: { bill: Bill }) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount)
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
        <h3 className="text-lg font-semibold">บิลค่าเช่า</h3>
        <p className="text-sm opacity-90">
          เดือน {new Date(bill.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ค่าเช่าพื้นที่:</span>
            <p className="font-medium text-right">{formatCurrency(bill.rent_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">
              ค่าน้ำ (หน่วย {bill.water_current_reading - bill.water_previous_reading}):
            </span>
            <p className="font-medium text-right">{formatCurrency(bill.water_amount)}</p>
            <p className="text-xs text-muted-foreground text-right">
              {bill.water_previous_reading} - {bill.water_current_reading} ={" "}
              {bill.water_current_reading - bill.water_previous_reading} หน่วย × {formatCurrency(bill.water_unit_rate)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">
              ค่าไฟ (หน่วย {bill.power_current_reading - bill.power_previous_reading}):
            </span>
            <p className="font-medium text-right">{formatCurrency(bill.power_amount)}</p>
            <p className="text-xs text-muted-foreground text-right">
              {bill.power_previous_reading} - {bill.power_current_reading} ={" "}
              {bill.power_current_reading - bill.power_previous_reading} หน่วย × {formatCurrency(bill.power_unit_rate)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">ค่าอินเทอร์เน็ต:</span>
            <p className="font-medium text-right">{formatCurrency(bill.internet_amount)}</p>
          </div>
          {bill.other_charges > 0 && (
            <div>
              <span className="text-muted-foreground">ค่าใช้จ่ายอื่นๆ:</span>
              <p className="font-medium text-right">{formatCurrency(bill.other_charges)}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>ยอดรวมทั้งสิ้น:</span>
            <span className="text-primary">{formatCurrency(bill.total_amount)}</span>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span>กำหนดชำระ:</span>
            <span>{formatDate(bill.due_date)}</span>
          </div>
          {bill.paid_date && (
            <div className="flex justify-between">
              <span>วันที่ชำระ:</span>
              <span>{formatDate(bill.paid_date)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>สถานะ:</span>
            <span>
              {bill.status === "paid" && "ชำระแล้ว"}
              {bill.status === "pending" && "รอตรวจสอบ"}
              {bill.status === "unpaid" && "ยังไม่ชำระ"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Upload & confirm ---------- */
function PaymentSlipUpload({
  billId,
  onSuccess,
  onDone,
}: {
  billId: string
  onSuccess: () => void
  onDone?: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  // ✅ อัปเดตตามคำแนะนำ: ไม่ใส่ชื่อ bucket ใน path (owner policy)
  //    ใช้ path สั้น ๆ เช่น `${billId}-${Date.now()}.${ext}`
  const doUpload = async (file: File) => {
    try {
      setUploading(true)

      const fileExt = file.name.split(".").pop() || "jpg"
      const filePath = `${billId}-${Date.now()}.${fileExt}` // ❗ ไม่มี "payment-slips/" นำหน้า

      const { error: uploadError } = await supabase.storage
        .from("payment-slips")
        .upload(filePath, file)
      if (uploadError) throw uploadError

      // บันทึกลงตาราง (เก็บ path แบบสั้น)
      const { error: insertError } = await supabase.from("payment_slips").insert([
        { bill_id: billId, file_url: filePath, file_name: file.name, notes },
      ])
      if (insertError) throw insertError

      // เรียก server ให้ confirm paid
      const { data: sess } = await supabase.auth.getSession()
      const accessToken = sess.session?.access_token
      const res = await fetch(`/api/user/bills/${billId}/confirm-paid`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "ยืนยันการชำระเงินไม่สำเร็จ")

      toast.success("ชำระเงินสำเร็จ! กำลังเปิดใบเสร็จ…")

      onSuccess?.()

      // เปิดใบเสร็จ
      const receiptUrl = json?.receiptUrl || `/api/user/bills/${billId}/receipt`
      const url = accessToken ? `${receiptUrl}?t=${encodeURIComponent(accessToken)}` : receiptUrl
      window.open(url, "_blank")

      // ปิด dialog และ refresh
      onDone?.()
      router.push("/dashboard/bills")
      router.refresh()
    } catch (error: any) {
      console.error("Error uploading/confirming:", error)
      toast.error(error?.message || "เกิดข้อผิดพลาดในการอัปโหลด/ยืนยันการชำระเงิน")
    } finally {
      setUploading(false)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await doUpload(file)
  }

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="หมายเหตุ (ถ้ามี)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* ซ่อน input แล้วกดปุ่มเพื่อเปิด file picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPickFile}
        className="hidden"
      />

      <Button
        disabled={uploading}
        className="w-full"
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์สลิปและอัปโหลด"}
      </Button>
    </div>
  )
}
