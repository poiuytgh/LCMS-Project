"use client"

import type React from "react"
import { useEffect, useState } from "react"
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

interface Bill {
  id: string
  contract: {
    id: string
    space: {
      name: string
      code: string
    }
  }
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
  status: string
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

  useEffect(() => {
    if (user) {
      fetchBills()
    }
  }, [user])

  useEffect(() => {
    filterBills()
  }, [bills, searchTerm, statusFilter])

  const fetchBills = async () => {
    try {
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
        `,
        )
        .eq("contract.tenant_id", user?.id)
        .order("billing_month", { ascending: false })

      if (error) throw error

      setBills(
        (data || []).map((bill: any) => ({
          ...bill,
          contract: bill.contract?.[0]
            ? {
                id: bill.contract[0].id,
                space: bill.contract[0].space?.[0] || { name: "", code: "" },
              }
            : { id: "", space: { name: "", code: "" } },
        })),
      )
    } catch (error) {
      console.error("Error fetching bills:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล")
    } finally {
      setLoading(false)
    }
  }

  const filterBills = () => {
    let filtered = bills

    if (searchTerm) {
      filtered = filtered.filter(
        (bill) =>
          bill.contract?.space?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.contract?.space?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          new Date(bill.billing_month)
            .toLocaleDateString("th-TH", { month: "long", year: "numeric" })
            .includes(searchTerm),
      )
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount)
  }

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status === "unpaid" && new Date(dueDate) < new Date()
  }

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

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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

                        {bill.status === "unpaid" && (
                          <Dialog>
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
                                  อัปโหลดสลิปการชำระเงินสำหรับบิลเดือน {formatMonth(bill.billing_month)}
                                </DialogDescription>
                              </DialogHeader>
                              <PaymentSlipUpload billId={bill.id} onSuccess={fetchBills} />
                            </DialogContent>
                          </Dialog>
                        )}

                        {bill.status === "paid" && (
                          <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-transparent"
                          onClick={async () => {
                            const { data } = await supabase.auth.getSession()
                            const token = data.session?.access_token
                            const url = token
                            ? `/api/user/bills/${bill.id}/receipt?t=${encodeURIComponent(token)}`
                            : `/api/user/bills/${bill.id}/receipt`
                            window.open(url, "_blank")
                            }}
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
                    {searchTerm || statusFilter !== "all" ? "ไม่พบบิลที่ตรงกับเงื่อนไขการค้นหา" : "คุณยังไม่มีบิลค่าเช่าในระบบ"}
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

// Bill Detail Component
function BillDetailView({ bill }: { bill: Bill }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
        <h3 className="text-lg font-semibold">บิลค่าเช่า</h3>
        <p className="text-sm opacity-90">
          เดือน {new Date(bill.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Bill Details */}
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

// Payment Slip Upload Component (อัปโหลด → บันทึก DB → ยืนยันชำระ → เปิดใบเสร็จ)
function PaymentSlipUpload({ billId, onSuccess }: { billId: string; onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState("")

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      // 1) อัปโหลดไฟล์ขึ้น Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${billId}-${Date.now()}.${fileExt}`
      const filePath = `payment-slips/${fileName}`

      const { data: sess } = await supabase.auth.getSession()
      const accessToken = sess.session?.access_token

      const { error: uploadError } = await supabase.storage.from("payment-slips").upload(filePath, file)
      if (uploadError) throw uploadError

      // 2) บันทึกข้อมูลสลิปลงตาราง (ใช้คอลัมน์ file_url, file_name ตามสคีมา)
      const { error: insertError } = await supabase.from("payment_slips").insert([
        {
          bill_id: billId,
          file_url: filePath,
          file_name: file.name,
          notes,
        },
      ])
      if (insertError) throw insertError

      // 3) เรียกเซิร์ฟเวอร์ให้ “ยืนยันชำระเงิน” -> เซ็ต bill = paid และคืน URL ใบเสร็จ
      const res = await fetch(`/api/user/bills/${billId}/confirm-paid`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "ยืนยันการชำระเงินไม่สำเร็จ")

      toast.success("ชำระเงินสำเร็จ! กำลังเตรียมใบเสร็จให้คุณ…")

      // 4) รีเฟรชรายการบิลบนหน้าจอ
      onSuccess?.()

      // 5) เปิดดาวน์โหลดใบเสร็จ PDF ทันที
      const receiptUrl = json?.receiptUrl || `/api/user/bills/${billId}/receipt`
      if (accessToken) {
        const url = `${receiptUrl}?t=${encodeURIComponent(accessToken)}`
        window.open(url, "_blank")
      } else {
        window.open(receiptUrl, "_blank")
      }
    } catch (error: any) {
      console.error("Error uploading/confirming:", error)
      toast.error(error?.message || "เกิดข้อผิดพลาดในการอัปโหลด/ยืนยันการชำระเงิน")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="หมายเหตุ (ถ้ามี)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
      <Button disabled={uploading} className="w-full">
        {uploading ? "กำลังอัปโหลด..." : "อัปโหลดสลิปและยืนยันชำระเงิน"}
      </Button>
    </div>
  )
}
