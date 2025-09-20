"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { NavAdmin } from "@/components/nav-admin"
import { FileText, Eye, Search, Filter } from "lucide-react"
import { createServerClient } from "@/lib/supabase"
import { toast } from "sonner"

interface ContractRecord {
  id: string
  rent_amount: number
  deposit_amount: number
  start_date: string
  end_date: string
  status: string
  created_at: string
  profiles?: Array<{ first_name: string; last_name: string }>
  spaces?: Array<{ name: string; code: string; type: string; description?: string | null }>
}

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [filtered, setFiltered] = useState<ContractRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    let items = contracts
    if (search) {
      items = items.filter((c) => {
        const tenant = c.profiles?.[0]
        const space = c.spaces?.[0]
        const name = `${tenant?.first_name || ""} ${tenant?.last_name || ""}`.toLowerCase()
        const spaceName = `${space?.name || ""} ${space?.code || ""}`.toLowerCase()
        return name.includes(search.toLowerCase()) || spaceName.includes(search.toLowerCase())
      })
    }
    if (statusFilter !== "all") {
      items = items.filter((c) => c.status === statusFilter)
    }
    setFiltered(items)
  }, [contracts, search, statusFilter])

  const fetchContracts = async () => {
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          id,
          rent_amount,
          deposit_amount,
          start_date,
          end_date,
          status,
          created_at,
          profiles!contracts_tenant_id_fkey (
            first_name,
            last_name
          ),
          spaces (
            name,
            code,
            type,
            description
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (e) {
      console.error("Error fetching contracts", e)
      toast.error("ไม่สามารถดึงข้อมูลสัญญาได้")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">ใช้งานอยู่</Badge>
      case "expiring":
        return <Badge className="bg-yellow-100 text-yellow-800">ใกล้หมดอายุ</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">หมดอายุ</Badge>
      case "cancelled":
        return <Badge variant="secondary">ยกเลิก</Badge>
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
            <p>กำลังโหลดข้อมูลสัญญา...</p>
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
            <h1 className="text-3xl font-bold mb-2">จัดการสัญญาเช่า</h1>
            <p className="text-muted-foreground">รายการสัญญาเช่าทั้งหมดในระบบ</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาผู้เช่า/พื้นที่/รหัสพื้นที่..."
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
                      <SelectItem value="active">ใช้งานอยู่</SelectItem>
                      <SelectItem value="expiring">ใกล้หมดอายุ</SelectItem>
                      <SelectItem value="expired">หมดอายุ</SelectItem>
                      <SelectItem value="cancelled">ยกเลิก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.length > 0 ? (
              filtered.map((c) => {
                const tenant = c.profiles?.[0]
                const space = c.spaces?.[0]
                return (
                  <Card key={c.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{space?.name || "ไม่ทราบชื่อพื้นที่"}</CardTitle>
                          <CardDescription className="mt-1">
                            ผู้เช่า: {tenant ? `${tenant.first_name} ${tenant.last_name}` : "ไม่ทราบ"} · พื้นที่: {space?.code}
                          </CardDescription>
                        </div>
                        {statusBadge(c.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ค่าเช่าต่อเดือน:</span>
                          <p className="font-medium">{formatCurrency(c.rent_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เงินประกัน:</span>
                          <p className="font-medium">{formatCurrency(c.deposit_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เริ่มสัญญา:</span>
                          <p>{formatDate(c.start_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">สิ้นสุดสัญญา:</span>
                          <p>{formatDate(c.end_date)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบสัญญา</h3>
                  <p className="text-muted-foreground">
                    {search || statusFilter !== "all" ? "ลองปรับตัวกรองหรือคำค้นหา" : "ยังไม่มีข้อมูลสัญญาในระบบ"}
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

