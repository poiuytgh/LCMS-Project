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
import { NavUser } from "@/components/nav-user"
import { AlertCircle, Plus, MessageSquare, Search, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

interface SupportTicket {
  id: string
  ticket_number: string
  title: string
  category: string
  severity: string
  description: string
  expected_behavior: string | null
  actual_behavior: string | null
  steps_to_reproduce: string | null
  page_url: string | null
  status: string
  created_at: string
  updated_at: string
}

export default function SupportPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTickets()
    }
  }, [user])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter, categoryFilter])

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setTickets(data || [])
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลปัญหา")
    } finally {
      setLoading(false)
    }
  }

  const filterTickets = () => {
    let filtered = tickets

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter)
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter)
    }

    setFilteredTickets(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800">ใหม่</Badge>
      case "acknowledged":
        return <Badge className="bg-purple-100 text-purple-800">รับทราบแล้ว</Badge>
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">กำลังดำเนินการ</Badge>
      case "need_info":
        return <Badge className="bg-orange-100 text-orange-800">ต้องการข้อมูลเพิ่มเติม</Badge>
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">แก้ไขแล้ว</Badge>
      case "closed":
        return <Badge variant="secondary">ปิดแล้ว</Badge>
      case "reopened":
        return <Badge className="bg-red-100 text-red-800">เปิดใหม่</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            ต่ำ
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            ปานกลาง
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            สูง
          </Badge>
        )
      case "urgent":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            เร่งด่วน
          </Badge>
        )
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      website: "เว็บไซต์",
      billing: "บิลค่าเช่า",
      contract: "สัญญาเช่า",
      technical: "ปัญหาเทคนิค",
      other: "อื่นๆ",
    }
    return categories[category] || category
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูลปัญหา...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">แจ้งปัญหาการใช้งาน</h1>
                <p className="text-muted-foreground">แจ้งปัญหาการใช้งานเว็บไซต์และติดตามสถานะ</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    แจ้งปัญหาใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>แจ้งปัญหาการใช้งาน</DialogTitle>
                    <DialogDescription>กรอกรายละเอียดปัญหาที่พบเพื่อให้ทีมงานสามารถช่วยเหลือได้อย่างรวดเร็ว</DialogDescription>
                  </DialogHeader>
                  <TicketForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false)
                      fetchTickets()
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Guidance Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">คำแนะนำในการแจ้งปัญหา</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• ระบุปัญหาที่เกี่ยวข้องกับการใช้งานเว็บไซต์เท่านั้น</li>
                    <li>• สำหรับปัญหาการซ่อมบำรุงพื้นที่ กรุณาติดต่อผู้ดูแลอาคารโดยตรง</li>
                    <li>• ให้รายละเอียดที่ชัดเจนเพื่อให้ทีมงานสามารถช่วยเหลือได้อย่างรวดเร็ว</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาตามหัวข้อ หมายเลขปัญหา หรือรายละเอียด..."
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
                      <SelectItem value="new">ใหม่</SelectItem>
                      <SelectItem value="acknowledged">รับทราบแล้ว</SelectItem>
                      <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                      <SelectItem value="need_info">ต้องการข้อมูลเพิ่มเติม</SelectItem>
                      <SelectItem value="resolved">แก้ไขแล้ว</SelectItem>
                      <SelectItem value="closed">ปิดแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                      <SelectItem value="website">เว็บไซต์</SelectItem>
                      <SelectItem value="billing">บิลค่าเช่า</SelectItem>
                      <SelectItem value="contract">สัญญาเช่า</SelectItem>
                      <SelectItem value="technical">ปัญหาเทคนิค</SelectItem>
                      <SelectItem value="other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          {getStatusBadge(ticket.status)}
                          {getSeverityBadge(ticket.severity)}
                        </div>
                        <CardDescription>
                          #{ticket.ticket_number} • {getCategoryLabel(ticket.category)} •{" "}
                          {formatDate(ticket.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              ดูรายละเอียด
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>รายละเอียดปัญหา #{ticket.ticket_number}</DialogTitle>
                              <DialogDescription>{ticket.title}</DialogDescription>
                            </DialogHeader>
                            <TicketDetail ticket={ticket} onUpdate={fetchTickets} />
                          </DialogContent>
                        </Dialog>

                        {ticket.status === "need_info" && (
                          <Button size="sm" className="flex-1">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            ตอบกลับ
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบปัญหาที่แจ้ง</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                      ? "ไม่พบปัญหาที่ตรงกับเงื่อนไขการค้นหา"
                      : "คุณยังไม่ได้แจ้งปัญหาใดๆ"}
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

// Ticket Form Component
function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    category: "website",
    severity: "medium",
    description: "",
    expectedBehavior: "",
    actualBehavior: "",
    stepsToReproduce: "",
    pageUrl: "",
  })
  const [saving, setSaving] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user?.id,
        title: formData.title,
        category: formData.category,
        severity: formData.severity,
        description: formData.description,
        expected_behavior: formData.expectedBehavior || null,
        actual_behavior: formData.actualBehavior || null,
        steps_to_reproduce: formData.stepsToReproduce || null,
        page_url: formData.pageUrl || null,
      })

      if (error) throw error

      toast.success("แจ้งปัญหาสำเร็จ ทีมงานจะดำเนินการตรวจสอบ")
      onSuccess()
    } catch (error) {
      console.error("Error creating ticket:", error)
      toast.error("เกิดข้อผิดพลาดในการแจ้งปัญหา")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">หมวดหมู่ปัญหา</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">เว็บไซต์</SelectItem>
              <SelectItem value="billing">บิลค่าเช่า</SelectItem>
              <SelectItem value="contract">สัญญาเช่า</SelectItem>
              <SelectItem value="technical">ปัญหาเทคนิค</SelectItem>
              <SelectItem value="other">อื่นๆ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">ระดับความสำคัญ</Label>
          <Select value={formData.severity} onValueChange={(value) => handleInputChange("severity", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">ต่ำ</SelectItem>
              <SelectItem value="medium">ปานกลาง</SelectItem>
              <SelectItem value="high">สูง</SelectItem>
              <SelectItem value="urgent">เร่งด่วน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">หัวข้อปัญหา</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          placeholder="สรุปปัญหาที่พบในหัวข้อสั้นๆ"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">รายละเอียดปัญหา</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="อธิบายปัญหาที่พบอย่างละเอียด..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedBehavior">สิ่งที่คาดหวัง (ไม่บังคับ)</Label>
        <Textarea
          id="expectedBehavior"
          value={formData.expectedBehavior}
          onChange={(e) => handleInputChange("expectedBehavior", e.target.value)}
          placeholder="อธิบายสิ่งที่คุณคาดหวังว่าควรจะเกิดขึ้น..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actualBehavior">สิ่งที่เกิดขึ้นจริง (ไม่บังคับ)</Label>
        <Textarea
          id="actualBehavior"
          value={formData.actualBehavior}
          onChange={(e) => handleInputChange("actualBehavior", e.target.value)}
          placeholder="อธิบายสิ่งที่เกิดขึ้นจริงแทน..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stepsToReproduce">ขั้นตอนการทำซ้ำ (ไม่บังคับ)</Label>
        <Textarea
          id="stepsToReproduce"
          value={formData.stepsToReproduce}
          onChange={(e) => handleInputChange("stepsToReproduce", e.target.value)}
          placeholder="1. ไปที่หน้า... 2. คลิกที่... 3. เกิดปัญหา..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pageUrl">URL หน้าที่เกิดปัญหา (ไม่บังคับ)</Label>
        <Input
          id="pageUrl"
          type="url"
          value={formData.pageUrl}
          onChange={(e) => handleInputChange("pageUrl", e.target.value)}
          placeholder="https://example.com/page"
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "กำลังส่งปัญหา..." : "ส่งปัญหา"}
      </Button>
    </form>
  )
}

// Ticket Detail Component
function TicketDetail({ ticket, onUpdate }: { ticket: SupportTicket; onUpdate: () => void }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800">ใหม่</Badge>
      case "acknowledged":
        return <Badge className="bg-purple-100 text-purple-800">รับทราบแล้ว</Badge>
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">กำลังดำเนินการ</Badge>
      case "need_info":
        return <Badge className="bg-orange-100 text-orange-800">ต้องการข้อมูลเพิ่มเติม</Badge>
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">แก้ไขแล้ว</Badge>
      case "closed":
        return <Badge variant="secondary">ปิดแล้ว</Badge>
      case "reopened":
        return <Badge className="bg-red-100 text-red-800">เปิดใหม่</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <h3 className="font-semibold">#{ticket.ticket_number}</h3>
          <p className="text-sm text-muted-foreground">สร้างเมื่อ {formatDate(ticket.created_at)}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(ticket.status)}
          <p className="text-sm text-muted-foreground mt-1">อัปเดตล่าสุด {formatDate(ticket.updated_at)}</p>
        </div>
      </div>

      {/* Ticket Details */}
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">รายละเอียดปัญหา</h4>
          <p className="text-sm bg-muted p-3 rounded">{ticket.description}</p>
        </div>

        {ticket.expected_behavior && (
          <div>
            <h4 className="font-medium mb-2">สิ่งที่คาดหวัง</h4>
            <p className="text-sm bg-muted p-3 rounded">{ticket.expected_behavior}</p>
          </div>
        )}

        {ticket.actual_behavior && (
          <div>
            <h4 className="font-medium mb-2">สิ่งที่เกิดขึ้นจริง</h4>
            <p className="text-sm bg-muted p-3 rounded">{ticket.actual_behavior}</p>
          </div>
        )}

        {ticket.steps_to_reproduce && (
          <div>
            <h4 className="font-medium mb-2">ขั้นตอนการทำซ้ำ</h4>
            <p className="text-sm bg-muted p-3 rounded whitespace-pre-line">{ticket.steps_to_reproduce}</p>
          </div>
        )}

        {ticket.page_url && (
          <div>
            <h4 className="font-medium mb-2">URL ที่เกิดปัญหา</h4>
            <a
              href={ticket.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {ticket.page_url}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {ticket.status === "resolved" && (
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            ปิดปัญหา
          </Button>
        )}
        {ticket.status === "need_info" && (
          <Button size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-1" />
            ตอบกลับ
          </Button>
        )}
      </div>
    </div>
  )
}
