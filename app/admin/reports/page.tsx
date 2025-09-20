"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavAdmin } from "@/components/nav-admin"
import { TrendingUp, BarChart3, AlertCircle, Building2 } from "lucide-react"
import { createServerClient } from "@/lib/supabase"
import { toast } from "sonner"

type MonthStat = { label: string; value: number }

export default function AdminReportsPage() {
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthStat[]>([])
  const [summary, setSummary] = useState({
    occupied: 0,
    totalSpaces: 0,
    overdueBills: 0,
    activeContracts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)

  const fetchReports = async () => {
    try {
      const supabase = createServerClient()

      // Revenue last 12 months
      const start = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 11)))
      const { data: bills } = await supabase
        .from("bills")
        .select("billing_month,total_amount,status")
        .gte("billing_month", start.toISOString())

      const byMonth = new Map<string, number>()
      for (let i = 0; i < 12; i++) {
        const d = new Date(start)
        d.setMonth(start.getMonth() + i)
        const key = d.toISOString().slice(0, 7)
        byMonth.set(key, 0)
      }
      for (const b of bills || []) {
        if (b.status !== "paid") continue
        const key = String(b.billing_month).slice(0, 7)
        byMonth.set(key, (byMonth.get(key) || 0) + (b.total_amount || 0))
      }
      const monthStats: MonthStat[] = Array.from(byMonth.entries()).map(([k, v]) => ({
        label: new Date(`${k}-01`).toLocaleDateString("th-TH", { month: "short", year: "numeric" }),
        value: v,
      }))

      // Spaces occupancy
      const { data: spaces } = await supabase.from("spaces").select("status")
      const totalSpaces = spaces?.length || 0
      const occupied = spaces?.filter((s) => s.status === "occupied").length || 0

      // Contracts active
      const { data: contracts } = await supabase.from("contracts").select("status")
      const activeContracts = contracts?.filter((c) => c.status === "active").length || 0

      // Overdue bills
      const { data: unpaid } = await supabase
        .from("bills")
        .select("id,due_date,status")
        .eq("status", "unpaid")
        .lt("due_date", new Date().toISOString())
      const overdueBills = unpaid?.length || 0

      setMonthlyRevenue(monthStats)
      setSummary({ occupied, totalSpaces, overdueBills, activeContracts })
    } catch (e) {
      console.error(e)
      toast.error("ไม่สามารถดึงข้อมูลรายงานได้")
    } finally {
      setLoading(false)
    }
  }

  const monthTotal = useMemo(() => monthlyRevenue.reduce((s, m) => s + m.value, 0), [monthlyRevenue])

  const formatCurrency = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดรายงาน...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">รายงาน/สถิติ</h1>
            <p className="text-muted-foreground">ภาพรวมรายได้ การครอบครองพื้นที่ และการค้างชำระ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">รายได้ 12 เดือนล่าสุด</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">อัตราการครอบครอง</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalSpaces > 0 ? Math.round((summary.occupied / summary.totalSpaces) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.occupied} / {summary.totalSpaces} พื้นที่ถูกใช้งาน
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">บิลเกินกำหนด</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.overdueBills}</div>
                <Badge variant="destructive" className="mt-2">ค้างชำระ</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">สัญญาที่ใช้งาน</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activeContracts}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายได้รายเดือน (12 เดือน)</CardTitle>
              <CardDescription>รวมเฉพาะบิลที่ชำระแล้ว</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyRevenue.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                    <span className="font-medium">{formatCurrency(m.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

