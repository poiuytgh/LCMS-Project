"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NavAdmin } from "@/components/nav-admin"
import { FileText, Eye, Search, Filter, Download, Plus, Trash2 } from "lucide-react"
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

type UploadedFile = {
  id: string
  contract_id: string | null
  tenant_id: string
  file_name: string
  download_url: string | null
  created_at: string
  mime_type?: string | null
  size_bytes?: number | null
  contracts?: {
    id: string
    spaces?: { name: string | null; code: string | null } | null
  } | null
  profiles?: { first_name: string | null; last_name: string | null } | null
}

export default function AdminContractsPage() {
  // ---- data states ----
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [filtered, setFiltered] = useState<ContractRecord[]>([])
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ---- ui states ----
  const [tab, setTab] = useState<"contracts" | "uploads">("contracts")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // ---- create dialog states ----
  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    tenant_id: "",
    space_id: "",
    rent_amount: "",
    deposit_amount: "",
    start_date: "",
    end_date: "",
    status: "active",
    terms: "",
  })

  const resetForm = () =>
    setForm({
      tenant_id: "",
      space_id: "",
      rent_amount: "",
      deposit_amount: "",
      start_date: "",
      end_date: "",
      status: "active",
      terms: "",
    })

  const refreshUploads = async () => {
    const uRes = await fetch("/api/admin/contract-files")
    const uJson = await uRes.json()
    if (!uRes.ok) throw new Error(uJson?.error || "uploads_failed")
    setUploads(uJson.items || [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        const [cRes, uRes] = await Promise.all([
          fetch("/api/admin/contracts"),
          fetch("/api/admin/contract-files"),
        ])
        const cJson = await cRes.json()
        const uJson = await uRes.json()
        if (!cRes.ok) throw new Error(cJson?.error || "contracts_failed")
        if (!uRes.ok) throw new Error(uJson?.error || "uploads_failed")
        setContracts(cJson.items || [])
        setUploads(uJson.items || [])
      } catch (e: any) {
        console.error(e)
        toast.error("โหลดข้อมูลไม่สำเร็จ")
      } finally {
        setLoading(false)
      }
    })()
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
    if (statusFilter !== "all") items = items.filter((c) => c.status === statusFilter)
    setFiltered(items)
  }, [contracts, search, statusFilter])

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: form.tenant_id,
          space_id: form.space_id,
          rent_amount: Number(form.rent_amount),
          deposit_amount: Number(form.deposit_amount),
          start_date: form.start_date,
          end_date: form.end_date,
          status: form.status,
          terms: form.terms,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "create_failed")

      toast.success("เพิ่มสัญญาเรียบร้อย")
      setOpenCreate(false)
      resetForm()
      setTab("contracts")

      const cRes = await fetch("/api/admin/contracts")
      const cJson = await cRes.json()
      if (cRes.ok) setContracts(cJson.items || [])
    } catch (err: any) {
      toast.error(err?.message || "เพิ่มสัญญาไม่สำเร็จ")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUpload = async (id: string) => {
    if (!confirm("ยืนยันลบเอกสารนี้หรือไม่?")) return
    try {
      setDeletingId(id)
      const res = await fetch(`/api/admin/contract-files/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "delete_failed")
      // ลบจาก state ทันที หรือจะ refreshUploads ก็ได้
      setUploads((prev) => prev.filter((x) => x.id !== id))
      toast.success("ลบไฟล์เรียบร้อย")
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "ลบไฟล์ไม่สำเร็จ")
    } finally {
      setDeletingId(null)
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
          {/* หัวเรื่อง + ปุ่มเพิ่มสัญญา */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">จัดการสัญญาเช่า</h1>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มข้อมูลสัญญา
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>เพิ่มข้อมูลสัญญาเช่า</DialogTitle>
                </DialogHeader>

                <form onSubmit={createContract} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tenant_id">Tenant ID</Label>
                      <Input
                        id="tenant_id"
                        value={form.tenant_id}
                        onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))}
                        placeholder="UUID ของผู้เช่า"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="space_id">Space ID</Label>
                      <Input
                        id="space_id"
                        value={form.space_id}
                        onChange={(e) => setForm((f) => ({ ...f, space_id: e.target.value }))}
                        placeholder="UUID ของพื้นที่"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rent_amount">ค่าเช่า (บาท/เดือน)</Label>
                      <Input
                        id="rent_amount"
                        type="number"
                        min="0"
                        value={form.rent_amount}
                        onChange={(e) => setForm((f) => ({ ...f, rent_amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="deposit_amount">เงินประกัน (บาท)</Label>
                      <Input
                        id="deposit_amount"
                        type="number"
                        min="0"
                        value={form.deposit_amount}
                        onChange={(e) => setForm((f) => ({ ...f, deposit_amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_date">วันที่เริ่ม</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="status">สถานะ</Label>
                      <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="เลือกสถานะ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">ใช้งานอยู่</SelectItem>
                          <SelectItem value="expiring">ใกล้หมดอายุ</SelectItem>
                          <SelectItem value="expired">หมดอายุ</SelectItem>
                          <SelectItem value="cancelled">ยกเลิก</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="terms">เงื่อนไข</Label>
                      <Textarea
                        id="terms"
                        rows={4}
                        value={form.terms}
                        onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                        placeholder="รายละเอียดเงื่อนไขสัญญา (ถ้ามี)"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? "กำลังบันทึก..." : "บันทึกสัญญา"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="mb-6">
              <TabsTrigger value="contracts">สัญญาเช่า</TabsTrigger>
              <TabsTrigger value="uploads">ตรวจสอบเอกสารอัปโหลด</TabsTrigger>
            </TabsList>

            {/* === Tab 1: Contracts === */}
            <TabsContent value="contracts">
              {/* ค้นหา / กรอง */}
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

              {/* รายการสัญญา */}
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
                      <p className="text-muted-foreground">ยังไม่มีข้อมูลสัญญาในระบบ</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* === Tab 2: Uploaded Files === */}
            <TabsContent value="uploads">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {uploads.length > 0 ? (
                  uploads.map((f) => (
                    <Card key={f.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{f.file_name}</CardTitle>
                            <CardDescription className="mt-1">
                              ผู้เช่า: {`${f.profiles?.first_name ?? ""} ${f.profiles?.last_name ?? ""}`.trim() || "ไม่ทราบ"}
                              {f.contracts?.spaces ? ` · พื้นที่: ${f.contracts.spaces.code ?? ""}` : ""}
                              {" · "}อัปโหลด: {formatDate(f.created_at)}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">ไฟล์</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {f.download_url ? (
                            <>
                              {/* View: เปิดในเบราว์เซอร์ (เหมาะกับ PDF/รูป) */}
                              <a href={f.download_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="bg-transparent">
                                  <Eye className="h-4 w-4 mr-1" />
                                  ดู
                                </Button>
                              </a>

                              {/* Download: บังคับดาวน์โหลด */}
                              <a href={f.download_url} target="_blank" rel="noopener noreferrer" download>
                                <Button size="sm" variant="outline" className="bg-transparent">
                                  <Download className="h-4 w-4 mr-1" />
                                  ดาวน์โหลด
                                </Button>
                              </a>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              ไม่มีลิงก์
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUpload(f.id)}
                            disabled={deletingId === f.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingId === f.id ? "กำลังลบ..." : "ลบ"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="text-center py-10">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <div className="font-medium">ยังไม่มีไฟล์ที่ผู้ใช้อัปโหลด</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
