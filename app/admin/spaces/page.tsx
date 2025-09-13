"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NavAdmin } from "@/components/nav-admin"
import { Building2, Plus, Edit, Trash2, Search, Filter } from "lucide-react"
import { createServerClient } from "@/lib/supabase"
import { toast } from "sonner"

interface Space {
  id: string
  code: string
  name: string
  type: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)

  useEffect(() => {
    fetchSpaces()
  }, [])

  useEffect(() => {
    filterSpaces()
  }, [spaces, searchTerm, statusFilter, typeFilter])

  const fetchSpaces = async () => {
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase.from("spaces").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setSpaces(data || [])
    } catch (error) {
      console.error("Error fetching spaces:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลพื้นที่")
    } finally {
      setLoading(false)
    }
  }

  const filterSpaces = () => {
    let filtered = spaces

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (space) =>
          space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          space.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((space) => space.status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((space) => space.type === typeFilter)
    }

    setFilteredSpaces(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">ว่าง</Badge>
      case "occupied":
        return <Badge variant="secondary">ใช้งานอยู่</Badge>
      case "maintenance":
        return <Badge className="bg-orange-100 text-orange-800">ซ่อมบำรุง</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      office: "สำนักงาน",
      retail: "ร้านค้า",
      warehouse: "โกดัง",
      residential: "ที่อยู่อาศัย",
    }
    return types[type] || type
  }

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบพื้นที่นี้?")) return

    try {
      const supabase = createServerClient()
      const { error } = await supabase.from("spaces").delete().eq("id", spaceId)

      if (error) throw error

      toast.success("ลบพื้นที่สำเร็จ")
      fetchSpaces()
    } catch (error) {
      console.error("Error deleting space:", error)
      toast.error("เกิดข้อผิดพลาดในการลบพื้นที่")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูลพื้นที่...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">จัดการพื้นที่</h1>
                <p className="text-muted-foreground">จัดการข้อมูลพื้นที่เช่าทั้งหมด</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มพื้นที่ใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มพื้นที่ใหม่</DialogTitle>
                    <DialogDescription>กรอกข้อมูลพื้นที่ที่ต้องการเพิ่ม</DialogDescription>
                  </DialogHeader>
                  <SpaceForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false)
                      fetchSpaces()
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาตามชื่อ รหัส หรือรายละเอียดพื้นที่..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      <SelectItem value="available">ว่าง</SelectItem>
                      <SelectItem value="occupied">ใช้งานอยู่</SelectItem>
                      <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="ประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกประเภท</SelectItem>
                      <SelectItem value="office">สำนักงาน</SelectItem>
                      <SelectItem value="retail">ร้านค้า</SelectItem>
                      <SelectItem value="warehouse">โกดัง</SelectItem>
                      <SelectItem value="residential">ที่อยู่อาศัย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpaces.length > 0 ? (
              filteredSpaces.map((space) => (
                <Card key={space.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{space.name}</CardTitle>
                        <CardDescription>
                          รหัส: {space.code} | {getTypeLabel(space.type)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(space.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {space.description && <p className="text-sm text-muted-foreground">{space.description}</p>}

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-transparent"
                              onClick={() => setEditingSpace(space)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              แก้ไข
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>แก้ไขพื้นที่</DialogTitle>
                              <DialogDescription>แก้ไขข้อมูลพื้นที่ {space.name}</DialogDescription>
                            </DialogHeader>
                            <SpaceForm
                              space={editingSpace}
                              onSuccess={() => {
                                setEditingSpace(null)
                                fetchSpaces()
                              }}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive bg-transparent"
                          onClick={() => handleDeleteSpace(space.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบพื้นที่</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                      ? "ไม่พบพื้นที่ที่ตรงกับเงื่อนไขการค้นหา"
                      : "ยังไม่มีพื้นที่ในระบบ"}
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

// Space Form Component
function SpaceForm({ space, onSuccess }: { space?: Space | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    code: space?.code || "",
    name: space?.name || "",
    type: space?.type || "office",
    description: space?.description || "",
    status: space?.status || "available",
  })
  const [saving, setSaving] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createServerClient()

      if (space) {
        // Update existing space
        const { error } = await supabase
          .from("spaces")
          .update({
            code: formData.code,
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            status: formData.status,
          })
          .eq("id", space.id)

        if (error) throw error
        toast.success("อัปเดตพื้นที่สำเร็จ")
      } else {
        // Create new space
        const { error } = await supabase.from("spaces").insert({
          code: formData.code,
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          status: formData.status,
        })

        if (error) throw error
        toast.success("เพิ่มพื้นที่สำเร็จ")
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving space:", error)
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">รหัสพื้นที่</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange("code", e.target.value)}
            placeholder="เช่น A101"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อพื้นที่</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="เช่น ห้องสำนักงาน A101"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">ประเภทพื้นที่</Label>
          <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="office">สำนักงาน</SelectItem>
              <SelectItem value="retail">ร้านค้า</SelectItem>
              <SelectItem value="warehouse">โกดัง</SelectItem>
              <SelectItem value="residential">ที่อยู่อาศัย</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">สถานะ</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">ว่าง</SelectItem>
              <SelectItem value="occupied">ใช้งานอยู่</SelectItem>
              <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">รายละเอียด</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับพื้นที่..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "กำลังบันทึก..." : space ? "อัปเดตพื้นที่" : "เพิ่มพื้นที่"}
      </Button>
    </form>
  )
}
