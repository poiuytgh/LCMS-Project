"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NavAdmin } from "@/components/nav-admin"
import { CreditCard, Eye, Search, Filter } from "lucide-react"
import { createServerClient } from "@/lib/supabase"
import { toast } from "sonner"

interface BillRecord {
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
  status: string
  due_date: string
  paid_date: string | null
  created_at: string
  contracts?: Array<{
    profiles?: Array<{ first_name: string; last_name: string }>
    spaces?: Array<{ name: string; code: string }>
  }>
}

export default function AdminBillsPage() {
  const [bills, setBills] = useState<BillRecord[]>([])
  const [filtered, setFiltered] = useState<BillRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null)

  useEffect(() => {
    fetchBills()
  }, [])

  useEffect(() => {
    let items = bills
    if (search) {
      items = items.filter((b) => {
        const contract = b.contracts?.[0]
        const space = contract?.spaces?.[0]
        const profile = contract?.profiles?.[0]
        const who = `${profile?.first_name || ""} ${profile?.last_name || ""}`.toLowerCase()
        const spaceLabel = `${space?.name || ""} ${space?.code || ""}`.toLowerCase()
        const monthStr = new Date(b.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
        return who.includes(search.toLowerCase()) || spaceLabel.includes(search.toLowerCase()) || monthStr.includes(search)
      })
    }
    if (statusFilter !== "all") {
      items = items.filter((b) => b.status === statusFilter)
    }
    setFiltered(items)
  }, [bills, search, statusFilter])

  const fetchBills = async () => {
    try {
      const supabase = createServerClient()
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
          contracts!bills_contract_id_fkey (
            profiles!contracts_tenant_id_fkey (
              first_name,
              last_name
            ),
            spaces (
              name,
              code
            )
          )
        `)
        .order("billing_month", { ascending: false })

      if (error) throw error
      setBills(data || [])
    } catch (e) {
      console.error("Error fetching bills", e)
      toast.error("ไม่สามารถดึงข้อมูลบิลได้")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)
  const formatDate = (s: string) => new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
  const formatMonth = (s: string) => new Date(s).toLocaleDateString("th-TH", { month: "long", year: "numeric" })
  const overdue = (d: string, status: string) => status === "unpaid" && new Date(d) < new Date()

  const badge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">ชำระแล้ว</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">รอตรวจสอบ</Badge>
      case "unpaid":
        return <Badge className="bg-red-100 text-red-800">ค้างชำระ</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
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
      <NavAdmin />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">จัดการบิลค่าเช่า</h1>
            <p className="text-muted-foreground">รายการบิลทั้งหมดของผู้เช่า</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาผู้เช่า/พื้นที่/เดือน..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="unpaid">ค้างชำระ</SelectItem>
                      <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                      <SelectItem value="paid">ชำระแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.length > 0 ? (
              filtered.map((b) => {
                const contract = b.contracts?.[0]
                const profile = contract?.profiles?.[0]
                const space = contract?.spaces?.[0]
                return (
                  <Card
                    key={b.id}
                    className={`hover:shadow-lg transition-shadow ${
                      overdue(b.due_date, b.status) ? "border-red-200 bg-red-50/50" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">บิล {formatMonth(b.billing_month)}</CardTitle>
                          <CardDescription className="mt-1">
                            {profile ? `${profile.first_name} ${profile.last_name}` : "ผู้เช่าไม่ทราบ"} · {space?.name} ({space?.code})
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          {badge(b.status)}
                          {overdue(b.due_date, b.status) && (
                            <Badge variant="destructive" className="mt-1 block">เกินกำหนด</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">ค่าเช่า:</span>
                            <p className="font-medium">{formatCurrency(b.rent_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">รวมชำระ:</span>
                            <p className="font-bold">{formatCurrency(b.total_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">กำหนดชำระ:</span>
                            <p className={overdue(b.due_date, b.status) ? "text-red-600 font-medium" : ""}>{formatDate(b.due_date)}</p>
                          </div>
                          {b.paid_date && (
                            <div>
                              <span className="text-muted-foreground">วันที่ชำระ:</span>
                              <p>{formatDate(b.paid_date)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={() => setSelectedBill(b)}>
                                <Eye className="h-4 w-4 mr-1" />
                                ดูรายละเอียด
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>รายละเอียดบิล</DialogTitle>
                              </DialogHeader>
                              {selectedBill && <BillDetail bill={selectedBill} />}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบบิล</h3>
                  <p className="text-muted-foreground">{search || statusFilter !== "all" ? "ลองปรับตัวกรองหรือคำค้นหา" : "ยังไม่มีข้อมูลบิลในระบบ"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BillDetail({ bill }: { bill: BillRecord }) {
  const formatCurrency = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)
  const formatDate = (s: string) => new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
  const usage = (curr: number, prev: number) => curr - prev

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">ค่าเช่าพื้นที่:</span>
          <p className="font-medium text-right">{formatCurrency(bill.rent_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">ค่าน้ำ ({usage(bill.water_current_reading, bill.water_previous_reading)} หน่วย):</span>
          <p className="font-medium text-right">{formatCurrency(bill.water_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">ค่าไฟ ({usage(bill.power_current_reading, bill.power_previous_reading)} หน่วย):</span>
          <p className="font-medium text-right">{formatCurrency(bill.power_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">อินเทอร์เน็ต/อื่นๆ:</span>
          <p className="font-medium text-right">{formatCurrency(bill.internet_amount + bill.other_charges)}</p>
        </div>
      </div>
      <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
        <span>รวมทั้งสิ้น:</span>
        <span className="text-primary">{formatCurrency(bill.total_amount)}</span>
      </div>
      <div className="bg-muted p-3 rounded text-sm">
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
            {bill.status === "unpaid" && "ค้างชำระ"}
          </span>
        </div>
      </div>
    </div>
  )
}

