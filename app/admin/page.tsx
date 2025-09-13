"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavAdmin } from "@/components/nav-admin"
import { FileText, Building2, CreditCard, AlertCircle, TrendingUp, Calendar, DollarSign } from "lucide-react"
import { createServerClient } from "@/lib/supabase"
import { toast } from "sonner"

interface DashboardStats {
  contracts: {
    total: number
    active: number
    expiring: number
    expired: number
  }
  spaces: {
    total: number
    available: number
    occupied: number
    maintenance: number
  }
  finance: {
    monthlyRevenue: number
    paid: number
    unpaid: number
    pending: number
  }
  support: {
    new: number
    needInfo: number
    overdue: number
    total: number
  }
}

interface ExpiringContract {
  id: string
  tenant_name: string
  space_name: string
  end_date: string
}

interface OverdueBill {
  id: string
  tenant_name: string
  space_name: string
  total_amount: number
  due_date: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    contracts: { total: 0, active: 0, expiring: 0, expired: 0 },
    spaces: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    finance: { monthlyRevenue: 0, paid: 0, unpaid: 0, pending: 0 },
    support: { new: 0, needInfo: 0, overdue: 0, total: 0 },
  })
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([])
  const [overdueBills, setOverdueBills] = useState<OverdueBill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createServerClient()

      // Fetch contract stats
      const { data: contracts } = await supabase.from("contracts").select("status")

      const contractStats = {
        total: contracts?.length || 0,
        active: contracts?.filter((c) => c.status === "active").length || 0,
        expiring: contracts?.filter((c) => c.status === "expiring").length || 0,
        expired: contracts?.filter((c) => c.status === "expired").length || 0,
      }

      // Fetch space stats
      const { data: spaces } = await supabase.from("spaces").select("status")

      const spaceStats = {
        total: spaces?.length || 0,
        available: spaces?.filter((s) => s.status === "available").length || 0,
        occupied: spaces?.filter((s) => s.status === "occupied").length || 0,
        maintenance: spaces?.filter((s) => s.status === "maintenance").length || 0,
      }

      // Fetch finance stats (current month)
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01"
      const { data: bills } = await supabase
        .from("bills")
        .select("status, total_amount")
        .gte("billing_month", currentMonth)

      const financeStats = {
        monthlyRevenue: bills?.reduce((sum, bill) => sum + (bill.status === "paid" ? bill.total_amount : 0), 0) || 0,
        paid: bills?.filter((b) => b.status === "paid").length || 0,
        unpaid: bills?.filter((b) => b.status === "unpaid").length || 0,
        pending: bills?.filter((b) => b.status === "pending").length || 0,
      }

      // Fetch support stats
      const { data: tickets } = await supabase.from("support_tickets").select("status, created_at")

      const supportStats = {
        total: tickets?.length || 0,
        new: tickets?.filter((t) => t.status === "new").length || 0,
        needInfo: tickets?.filter((t) => t.status === "need_info").length || 0,
        overdue:
          tickets?.filter((t) => {
            const daysSinceCreated = Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
            return ["new", "acknowledged"].includes(t.status) && daysSinceCreated > 3
          }).length || 0,
      }

      // Fetch expiring contracts (top 5)
      const { data: expiringData } = await supabase
        .from("contracts")
        .select(`
          id,
          end_date,
          profiles!contracts_tenant_id_fkey (
            first_name,
            last_name
          ),
          spaces (
            name
          )
        `)
        .eq("status", "expiring")
        .order("end_date", { ascending: true })
        .limit(5)

      const expiring =
  expiringData?.map((contract) => ({
    id: contract.id,
    tenant_name: contract.profiles?.[0]
      ? `${contract.profiles[0].first_name} ${contract.profiles[0].last_name}`
      : "ไม่ระบุ",
    space_name: contract.spaces?.[0]?.name || "ไม่ระบุ",
    end_date: contract.end_date,
  })) || []


      // Fetch overdue bills (top 5)
      const { data: overdueData } = await supabase
        .from("bills")
        .select(`
          id,
          total_amount,
          due_date,
          contracts!bills_contract_id_fkey (
            profiles!contracts_tenant_id_fkey (
              first_name,
              last_name
            ),
            spaces (
              name
            )
          )
        `)
        .eq("status", "unpaid")
        .lt("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(5)

      const overdue =
  overdueData?.map((bill) => {
    const contract = bill.contracts?.[0] // 👉 ดึง element แรกออกมา
    const profile = contract?.profiles?.[0]
    const space = contract?.spaces?.[0]

    return {
      id: bill.id,
      tenant_name: profile ? `${profile.first_name} ${profile.last_name}` : "ไม่ระบุ",
      space_name: space?.name || "ไม่ระบุ",
      total_amount: bill.total_amount,
      due_date: bill.due_date,
    }
  }) || []



      setStats({
        contracts: contractStats,
        spaces: spaceStats,
        finance: financeStats,
        support: supportStats,
      })
      setExpiringContracts(expiring)
      setOverdueBills(overdue)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
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
      <NavAdmin />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">ภาพรวมการจัดการระบบสัญญาเช่าพื้นที่</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Contracts Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">สัญญาเช่า</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contracts.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge variant="secondary">{stats.contracts.active} ใช้งาน</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.contracts.expiring} ใกล้หมด</Badge>
                  <Badge variant="destructive">{stats.contracts.expired} หมดอายุ</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Spaces Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">พื้นที่</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.spaces.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-green-100 text-green-800">{stats.spaces.available} ว่าง</Badge>
                  <Badge variant="secondary">{stats.spaces.occupied} ใช้งาน</Badge>
                  <Badge className="bg-orange-100 text-orange-800">{stats.spaces.maintenance} ซ่อม</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Finance Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">รายได้เดือนนี้</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.finance.monthlyRevenue)}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-green-100 text-green-800">{stats.finance.paid} ชำระแล้ว</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.finance.pending} รอตรวจ</Badge>
                  <Badge variant="destructive">{stats.finance.unpaid} ค้างชำระ</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Support Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ปัญหาการใช้งาน</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.support.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-blue-100 text-blue-800">{stats.support.new} ใหม่</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.support.needInfo} ต้องข้อมูล</Badge>
                  <Badge variant="destructive">{stats.support.overdue} เกินกำหนด</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Expiring Contracts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  สัญญาใกล้หมดอายุ (5 อันดับแรก)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringContracts.length > 0 ? (
                  <div className="space-y-3">
                    {expiringContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                      >
                        <div>
                          <p className="font-medium text-sm">{contract.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{contract.space_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-700">{formatDate(contract.end_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">ไม่มีสัญญาที่ใกล้หมดอายุ</p>
                )}
              </CardContent>
            </Card>

            {/* Overdue Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  บิลค้างชำระ (5 อันดับแรก)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueBills.length > 0 ? (
                  <div className="space-y-3">
                    {overdueBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                      >
                        <div>
                          <p className="font-medium text-sm">{bill.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{bill.space_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-700">{formatCurrency(bill.total_amount)}</p>
                          <p className="text-xs text-red-600">เกิน {formatDate(bill.due_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">ไม่มีบิลค้างชำระ</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                รายได้รายเดือน
              </CardTitle>
              <CardDescription>กราฟแสดงรายได้ในช่วง 12 เดือนที่ผ่านมา</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">กราฟรายได้จะแสดงที่นี่</p>
                  <p className="text-sm text-muted-foreground mt-1">ใช้ Recharts หรือ Chart.js สำหรับการแสดงผล</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
