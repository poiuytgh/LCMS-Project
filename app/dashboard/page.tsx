"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NavUser } from "@/components/nav-user"
import { FileText, CreditCard, AlertCircle, Download, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"
import Link from "next/link"

interface Contract {
  id: string
  space: {
    name: string
    code: string
  } | null
  rent_amount: number
  start_date: string
  end_date: string
  status: string
}

interface Bill {
  id: string
  billing_month: string
  total_amount: number
  status: string
  due_date: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  is_read: boolean
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // ✅ Fetch contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          rent_amount,
          start_date,
          end_date,
          status,
          spaces (
            name,
            code
          )
        `,
        )
        .eq("tenant_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(4)

      if (contractsError) throw contractsError

      // ✅ Map spaces → space (ใช้ตัวแรกของ array)
      const mappedContracts: Contract[] = (contractsData || []).map((c: any) => ({
        id: c.id,
        rent_amount: c.rent_amount,
        start_date: c.start_date,
        end_date: c.end_date,
        status: c.status,
        space: c.spaces?.[0] || null,
      }))

      // ✅ Fetch recent bills
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select(
          `
          id,
          billing_month,
          total_amount,
          status,
          due_date,
          contracts!inner (
            tenant_id
          )
        `,
        )
        .eq("contracts.tenant_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(4)

      if (billsError) throw billsError

      // ✅ Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (notificationsError) throw notificationsError

      setContracts(mappedContracts)
      setBills(billsData || [])
      setNotifications(notificationsData || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, type: "contract" | "bill") => {
    if (type === "contract") {
      switch (status) {
        case "active":
          return <Badge className="bg-green-100 text-green-800">ใช้งานอยู่</Badge>
        case "expiring":
          return <Badge className="bg-yellow-100 text-yellow-800">ใกล้หมดอายุ</Badge>
        case "expired":
          return <Badge className="bg-red-100 text-red-800">หมดอายุ</Badge>
        default:
          return <Badge variant="secondary">{status}</Badge>
      }
    } else {
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูล...</p>
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
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">ภาพรวมสัญญาเช่าและบิลค่าเช่าของคุณ</p>
          </div>

          {/* Contracts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                สัญญาเช่าของฉัน
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/contracts">ดูทั้งหมด</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.length > 0 ? (
                contracts.map((contract) => (
                  <Card key={contract.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{contract.space?.name || "ไม่ระบุชื่อพื้นที่"}</CardTitle>
                        {getStatusBadge(contract.status, "contract")}
                      </div>
                      <CardDescription>รหัสพื้นที่: {contract.space?.code || "ไม่ระบุ"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ค่าเช่า:</span>
                          <span className="font-medium">{formatCurrency(contract.rent_amount)}/เดือน</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">เริ่มต้น:</span>
                          <span>{formatDate(contract.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">สิ้นสุด:</span>
                          <span>{formatDate(contract.end_date)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Download className="h-4 w-4 mr-1" />
                          ดาวน์โหลด PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีสัญญาเช่า</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Bills Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                บิลค่าเช่าล่าสุด
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/bills">ดูทั้งหมด</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <Card key={bill.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          บิลเดือน{" "}
                          {new Date(bill.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                        </CardTitle>
                        {getStatusBadge(bill.status, "bill")}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ยอดรวม:</span>
                          <span className="font-medium text-lg">{formatCurrency(bill.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">กำหนดชำระ:</span>
                          <span>{formatDate(bill.due_date)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                        {bill.status === "unpaid" && (
                          <Button size="sm" className="flex-1">
                            ชำระเงิน
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีบิลค่าเช่า</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Notifications and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  การแจ้งเตือนล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                        {!notification.is_read && <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">ไม่มีการแจ้งเตือน</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>การดำเนินการด่วน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/dashboard/support">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      แจ้งปัญหาการใช้งาน
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/dashboard/bills">
                      <CreditCard className="h-4 w-4 mr-2" />
                      ตรวจสอบบิลค่าเช่า
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                    <Link href="/dashboard/contracts">
                      <FileText className="h-4 w-4 mr-2" />
                      ดูสัญญาเช่าทั้งหมด
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
