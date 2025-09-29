"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NavUser } from "@/components/nav-user"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { ArrowLeft, Upload, Download } from "lucide-react"

// libs สำหรับสร้าง QR
// @ts-ignore
import generatePayload from "promptpay-qr"
// @ts-ignore
import QRCode from "qrcode"

type Bill = {
  id: string
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
  status: "unpaid" | "pending" | "paid" | string
  due_date: string
  paid_date: string | null
  created_at: string
  contract?: {
    id: string
    tenant_id: string
    space?: { name: string; code: string }
  }
}

export default function PayBillPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID ?? "0888888888"
  const BANK_INFO = {
    bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "ธนาคารกรุงไทย (KTB)",
    accountNo: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO ?? "123-4-56789-0",
    accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "บริษัท LMCS กรุ๊ป 220 จำกัด",
  }

  useEffect(() => {
    if (!user) return
    fetchBill()
  }, [user])

  useEffect(() => {
    if (!bill) return
    generateQr(bill.total_amount)
  }, [bill])

  const fetchBill = async () => {
    try {
      const { data, error } = await supabase
        .from("bills")
        .select(`
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
              name, code
            )
          )
        `)
        .eq("id", params.id)
        .eq("contract.tenant_id", user?.id)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error("ไม่พบบิลหรือไม่มีสิทธิ์เข้าถึง")
        router.replace("/dashboard/bills")
        return
      }

      const normalized: Bill = {
        ...data,
        contract: data.contract?.[0]
          ? {
              id: data.contract[0].id,
              tenant_id: data.contract[0].tenant_id,
              space: data.contract[0].space?.[0] || { name: "", code: "" },
            }
          : undefined,
      }

      setBill(normalized)
    } catch (e) {
      console.error(e)
      toast.error("โหลดข้อมูลบิลไม่สำเร็จ")
      router.replace("/dashboard/bills")
    } finally {
      setLoading(false)
    }
  }

  async function generateQr(amount: number) {
    try {
      const payload = generatePayload(PROMPTPAY_ID, { amount: Number(amount || 0) })
      const url = await QRCode.toDataURL(payload, { width: 320, margin: 1 })
      setQrDataUrl(url)
    } catch (e) {
      console.error("QR gen error", e)
      toast.error("สร้าง QR ไม่สำเร็จ")
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0))
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
  const formatMonth = (s: string) => new Date(s).toLocaleDateString("th-TH", { month: "long", year: "numeric" })

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!bill) return null

  return (
    <div className="min-h-screen flex flex-col">
      <NavUser />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="px-0 w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>ชำระบิลเดือน {formatMonth(bill.billing_month)}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {bill.contract?.space?.name} ({bill.contract?.space?.code})
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="mb-3 font-semibold">ช่องทางชำระเงินด้วย Thai QR Payment</div>
                  <div className="rounded-lg border p-4 bg-white">
                    <div className="mb-2">
                      <div className="text-sm text-muted-foreground">บัญชี PromptPay</div>
                      <div className="text-base font-medium">{BANK_INFO.accountName}</div>
                      <div className="text-sm text-muted-foreground">
                        เลขบัญชี/พร้อมเพย์: {PROMPTPAY_ID}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({BANK_INFO.bankName} • {BANK_INFO.accountNo})
                      </div>
                    </div>
                    <div className="flex items-center justify-center my-3">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="PromptPay QR"
                          className="rounded-lg border w-[320px] h-[320px] object-contain bg-white"
                        />
                      ) : (
                        <div className="w-[320px] h-[320px] grid place-items-center bg-muted rounded-lg">
                          สร้าง QR ไม่สำเร็จ
                        </div>
                      )}
                    </div>
                    <div className="text-center text-sm">
                      โปรดสแกนเพื่อชำระ <span className="font-semibold">{formatCurrency(bill.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border bg-card p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ค่าเช่า</span>
                      <span className="font-medium">{formatCurrency(bill.rent_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ค่าน้ำ</span>
                      <span className="font-medium">{formatCurrency(bill.water_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ค่าไฟ</span>
                      <span className="font-medium">{formatCurrency(bill.power_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">อินเทอร์เน็ต</span>
                      <span className="font-medium">{formatCurrency(bill.internet_amount)}</span>
                    </div>
                    {bill.other_charges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">อื่น ๆ</span>
                        <span className="font-medium">{formatCurrency(bill.other_charges)}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                      <span>ยอดรวม</span>
                      <span className="text-primary">{formatCurrency(bill.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>ครบกำหนดชำระ</span>
                      <span>{formatDate(bill.due_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>สถานะ</span>
                      <span>
                        {bill.status === "paid" && <Badge className="bg-green-100 text-green-800">ชำระแล้ว</Badge>}
                        {bill.status === "pending" && (
                          <Badge className="bg-yellow-100 text-yellow-800">รอตรวจสอบ</Badge>
                        )}
                        {bill.status === "unpaid" && (
                          <Badge className="bg-red-100 text-red-800">ยังไม่ชำระ</Badge>
                        )}
                      </span>
                    </div>
                  </div>

                  {bill.status !== "paid" ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          อัปโหลดสลิป & ยืนยันชำระเงิน
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>อัปโหลดสลิปการชำระเงิน</DialogTitle>
                        </DialogHeader>
                        <PaymentSlipUpload
                          billId={bill.id}
                          onSuccess={() => {
                            fetchBill()
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button asChild variant="outline" className="w-full bg-transparent">
                      <a href={`/api/user/bills/${bill.id}/receipt`} target="_blank" rel="noopener">
                        <Download className="h-4 w-4 mr-2" />
                        ดาวน์โหลดใบเสร็จ
                      </a>
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full" onClick={() => router.push("/dashboard/bills")}>
                    กลับไปหน้าบิลทั้งหมด
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PaymentSlipUpload({ billId, onSuccess }: { billId: string; onSuccess?: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)

  const pickFile = () => fileRef.current?.click()

  const handlePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)

      const fileExt = file.name.split(".").pop() || "jpg"
      const filePath = `${billId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("payment-slips").upload(filePath, file)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from("payment_slips").insert([
        { bill_id: billId, file_url: filePath, file_name: file.name, notes },
      ])
      if (insertError) throw insertError

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

      const receiptUrl = json?.receiptUrl || `/api/user/bills/${billId}/receipt`
      const url = accessToken ? `${receiptUrl}?t=${encodeURIComponent(accessToken)}` : receiptUrl
      window.open(url, "_blank")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "เกิดข้อผิดพลาดในการอัปโหลด/ยืนยันการชำระเงิน")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Input
        type="text"
        placeholder="หมายเหตุ (ถ้ามี)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicked} />

      <Button className="w-full" onClick={pickFile} disabled={uploading}>
        {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์สลิปและอัปโหลด"}
      </Button>
    </div>
  )
}
