"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { NavUser } from "@/components/nav-user"
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Upload,
  UploadCloud,
  X,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

interface Contract {
  id: string
  space: { name: string; code: string; type: string; description: string }
  rent_amount: number
  deposit_amount: number
  start_date: string
  end_date: string
  status: string
  terms: string
  created_at: string
}

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"]
const MAX_SIZE_MB = 15

export default function ContractsPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // upload states
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string>("")
  const [fileError, setFileError] = useState<string>("")
  const [dragActive, setDragActive] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState<string>("")

  useEffect(() => {
    if (user) fetchContracts()
  }, [user])

  useEffect(() => {
    filterContracts()
  }, [contracts, searchTerm, statusFilter])

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          id,
          rent_amount,
          deposit_amount,
          start_date,
          end_date,
          status,
          terms,
          created_at,
          spaces ( name, code, type, description )
        `)
        .eq("tenant_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      const normalized: Contract[] = (data ?? []).map((row: any) => ({
        id: row.id,
        rent_amount: row.rent_amount,
        deposit_amount: row.deposit_amount,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        terms: row.terms,
        created_at: row.created_at,
        space: Array.isArray(row.spaces) ? row.spaces[0] : row.spaces,
      }))
      setContracts(normalized)
    } catch (err) {
      console.error(err)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสัญญา")
    } finally {
      setLoading(false)
    }
  }

  const filterContracts = () => {
    let filtered = contracts
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.space?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.space?.code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (statusFilter !== "all") filtered = filtered.filter((c) => c.status === statusFilter)
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

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n)

  const getSpaceTypeLabel = (t: string) =>
    ({ office: "สำนักงาน", retail: "ร้านค้า", warehouse: "โกดัง", residential: "ที่อยู่อาศัย" } as any)[t] || t

  // Helpers
  const bytesToSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"]
    let i = 0
    let val = bytes
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024
      i++
    }
    return `${val.toFixed(1)} ${units[i]}`
  }

  const isImage = useMemo(() => (file?.type || "").startsWith("image/"), [file])

  const validateAndSetFile = (f: File | null) => {
    setFileError("")
    if (!f) {
      setFile(null)
      setFileUrl("")
      return
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError("ชนิดไฟล์ไม่รองรับ (รองรับ: PDF, JPG, PNG)")
      setFile(null)
      setFileUrl("")
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_SIZE_MB}MB)`)
      setFile(null)
      setFileUrl("")
      return
    }
    setFile(f)
    const url = URL.createObjectURL(f)
    setFileUrl(url)
  }

  // === Upload handler ===
  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error("ยังไม่พบผู้ใช้")
    if (!file) return toast.error("กรุณาเลือกไฟล์ก่อน")
    try {
      setUploading(true)
      const form = new FormData()
      form.append("file", file)
      form.append("tenantId", user.id)
      if (selectedContractId) form.append("contractId", selectedContractId)

      const res = await fetch("/api/user/contracts/upload", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "upload_failed")

      toast.success("อัปโหลดสัญญาเรียบร้อย")
      // reset
      setFile(null)
      setFileUrl("")
      setSelectedContractId("")
    } catch (err: any) {
      toast.error(err?.message || "อัปโหลดไม่สำเร็จ")
    } finally {
      setUploading(false)
    }
  }

  // Drag & Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    validateAndSetFile(f || null)
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">สัญญาเช่าของฉัน</h1>
            <p className="text-muted-foreground">จัดการและดูรายละเอียดสัญญาเช่าทั้งหมด</p>
          </div>

          <Tabs defaultValue="list">
            <TabsList className="mb-4">
              <TabsTrigger value="list">ดูสัญญา</TabsTrigger>
              <TabsTrigger value="upload">เพิ่มสัญญา</TabsTrigger>
            </TabsList>

            {/* === Tab: รายการสัญญา === */}
            <TabsContent value="list">
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
                        {searchTerm || statusFilter !== "all"
                          ? "ไม่พบสัญญาเช่าที่ตรงกับเงื่อนไขการค้นหา"
                          : "คุณยังไม่มีสัญญาเช่าในระบบ"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* === Tab: อัปโหลดสัญญา (UI ใหม่) === */}
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>อัปโหลดเอกสารสัญญา</CardTitle>
                  <CardDescription>
                    รองรับไฟล์ <strong>PDF/JPG/PNG</strong> ขนาดไม่เกิน <strong>{MAX_SIZE_MB}MB</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onUpload} className="space-y-5">
                    {contracts.length > 0 && (
                      <div className="grid gap-2">
                        <label className="text-sm text-muted-foreground">ผูกกับสัญญาที่มีอยู่ (ไม่บังคับ)</label>
                        <Select value={selectedContractId} onValueChange={setSelectedContractId} disabled={uploading}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกสัญญา (ถ้ามี)" />
                          </SelectTrigger>
                          <SelectContent>
                            {contracts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {(c.space?.name || c.space?.code) ?? c.id} · {c.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Dropzone */}
                    <div
                      className={[
                        "rounded-xl border border-dashed p-6 sm:p-8 transition",
                        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20",
                        uploading ? "opacity-60 pointer-events-none" : "",
                      ].join(" ")}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                    >
                      {!file ? (
                        <div className="flex flex-col items-center text-center gap-3">
                          <UploadCloud className="h-10 w-10" />
                          <div className="space-y-1">
                            <div className="font-medium">ลากไฟล์มาวางที่นี่ หรือเลือกไฟล์จากเครื่อง</div>
                            <p className="text-sm text-muted-foreground">
                              รองรับ: PDF, JPG, PNG • สูงสุด {MAX_SIZE_MB}MB
                            </p>
                          </div>
                          <label className="relative">
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
                              disabled={uploading}
                            />
                            <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm cursor-pointer">
                              <Upload className="h-4 w-4" />
                              เลือกไฟล์
                            </span>
                          </label>
                          {fileError && (
                            <div className="mt-2 inline-flex items-center gap-2 text-red-600 text-sm">
                              <AlertTriangle className="h-4 w-4" /> {fileError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="shrink-0">
                            {isImage ? (
                              <img
                                src={fileUrl}
                                alt="preview"
                                className="h-20 w-20 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="h-20 w-20 rounded-md border bg-white flex items-center justify-center">
                                <FileText className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{file.name}</span>
                              <Badge variant="secondary" className="shrink-0">
                                {bytesToSize(file.size)}
                              </Badge>
                              {ALLOWED_TYPES.includes(file.type) && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 truncate">{file.type}</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => validateAndSetFile(null)}
                            disabled={uploading}
                            className="bg-transparent"
                          >
                            <X className="h-4 w-4 mr-1" />
                            ล้างไฟล์
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={uploading || !file}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
