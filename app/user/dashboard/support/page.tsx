"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    if (user) fetchTickets()
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
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter)
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter)
    }
    setFilteredTickets(filtered)
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavUser />
        <div className="flex-1 flex items-center justify-center">
          <p>กำลังโหลดข้อมูลปัญหา...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavUser />

      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">แจ้งปัญหาการใช้งาน</h1>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  แจ้งปัญหาใหม่
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>แจ้งปัญหาใหม่</DialogTitle>
                  <DialogDescription>กรอกข้อมูลด้านล่างเพื่อแจ้งปัญหาไปยังผู้ดูแลระบบ</DialogDescription>
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

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาปัญหา..."
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
                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
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
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{ticket.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          #{ticket.ticket_number} • {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{ticket.status}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                    <Button size="sm" variant="outline" className="mt-3 flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      ดูรายละเอียด
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ยังไม่มีการแจ้งปัญหา</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    category: "website",
    severity: "medium",
    description: "",
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field: string, value: string) => {
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
      })
      if (error) throw error
      toast.success("ส่งปัญหาสำเร็จ")
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error("เกิดข้อผิดพลาดในการส่งปัญหา")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>หมวดหมู่</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
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
        <div>
          <Label>ความสำคัญ</Label>
          <Select value={formData.severity} onValueChange={(v) => handleChange("severity", v)}>
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

      <div>
        <Label>หัวข้อ</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="เช่น ปัญหาการเข้าสู่ระบบ"
          required
        />
      </div>

      <div>
        <Label>รายละเอียด</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="อธิบายรายละเอียดปัญหาที่คุณพบ..."
          rows={4}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "กำลังส่ง..." : "ส่งปัญหา"}
      </Button>
    </form>
  )
}
