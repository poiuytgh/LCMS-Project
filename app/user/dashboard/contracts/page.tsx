"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NavUser } from "@/components/nav-user"
import { FileText, Download, Eye, Search, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

interface Contract {
  id: string
  space: {
    name: string
    code: string
    type: string
    description: string
  }
  rent_amount: number
  deposit_amount: number
  start_date: string
  end_date: string
  status: string
  terms: string
  created_at: string
}

export default function ContractsPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (user) {
      fetchContracts()
    }
  }, [user])

  useEffect(() => {
    filterContracts()
  }, [contracts, searchTerm, statusFilter])

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          id,
          rent_amount,
          deposit_amount,
          start_date,
          end_date,
          status,
          terms,
          created_at,
          spaces (
            name,
            code,
            type,
            description
          )
        `,
        )
        .eq("tenant_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setContracts(data || [])
    } catch (error) {
      console.error("Error fetching contracts:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสัญญา")
    } finally {
      setLoading(false)
    }
  }

  const filterContracts = () => {
    let filtered = contracts

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.space?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.space?.code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((contract) => contract.status === statusFilter)
    }

    setFilteredContracts(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">ใช้งานอยู่</Badge>
      case "expiring":
        return <Badge className="bg-yellow-100 text-yellow-800">ใกล้หมดอายุ</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">หมดอายุ</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">ยกเลิก</Badge>
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

  const getSpaceTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      office: "สำนักงาน",
      retail: "ร้านค้า",
      warehouse: "โกดัง",
      residential: "ที่อยู่อาศัย",
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
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
      <NavUser />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">สัญญาเช่าของฉัน</h1>
            <p className="text-muted-foreground">จัดการและดูรายละเอียดสัญญาเช่าทั้งหมด</p>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาตามชื่อพื้นที่หรือรหัสพื้นที่..."
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

          {/* Contracts List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredContracts.length > 0 ? (
              filteredContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{contract.space?.name || "ไม่ระบุชื่อพื้นที่"}</CardTitle>
                        <CardDescription className="mt-1">
                          รหัส: {contract.space?.code} | ประเภท: {getSpaceTypeLabel(contract.space?.type || "")}
                        </CardDescription>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ค่าเช่า:</span>
                          <p className="font-medium">{formatCurrency(contract.rent_amount)}/เดือน</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เงินมัดจำ:</span>
                          <p className="font-medium">{formatCurrency(contract.deposit_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เริ่มต้น:</span>
                          <p>{formatDate(contract.start_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">สิ้นสุด:</span>
                          <p>{formatDate(contract.end_date)}</p>
                        </div>
                      </div>

                      {contract.space?.description && (
                        <div>
                          <span className="text-muted-foreground text-sm">รายละเอียดพื้นที่:</span>
                          <p className="text-sm mt-1">{contract.space.description}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Download className="h-4 w-4 mr-1" />
                          ดาวน์โหลด PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบสัญญาเช่า</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" ? "ไม่พบสัญญาเช่าที่ตรงกับเงื่อนไขการค้นหา" : "คุณยังไม่มีสัญญาเช่าในระบบ"}
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
