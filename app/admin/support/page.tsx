"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { createServerClient } from "@/lib/supabase"
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
  profiles: {
    first_name: string
    last_name: string
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter, categoryFilter])

  const fetchTickets = async () => {
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
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
          `${ticket.profiles.first_name} ${ticket.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const supabase = createServerClient()
      const { error } = await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticketId)

      if (error) throw error

      toast.success("อัปเดตสถานะสำเร็จ")
      fetchTickets()
    } catch (error) {
      console.error("Error updating ticket status:", error)
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการปัญหาการใช้งาน</h1>
        <p className="text-gray-600">ติดตามและจัดการปัญหาการใช้งานจากผู้เช่า</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
            <input
              type="text"
              placeholder="ค้นหาหมายเลขปัญหา, หัวข้อ, หรือชื่อผู้แจ้ง"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="new">ใหม่</option>
              <option value="acknowledged">รับทราบแล้ว</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="need_info">ต้องการข้อมูลเพิ่มเติม</option>
              <option value="resolved">แก้ไขแล้ว</option>
              <option value="closed">ปิดแล้ว</option>
              <option value="reopened">เปิดใหม่</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="website">เว็บไซต์</option>
              <option value="billing">บิลค่าเช่า</option>
              <option value="contract">สัญญาเช่า</option>
              <option value="technical">ปัญหาเทคนิค</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setCategoryFilter("all")
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">รายการปัญหา ({filteredTickets.length})</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">ไม่พบรายการปัญหาที่ตรงกับเงื่อนไขการค้นหา</div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{ticket.title}</h3>
                      {getStatusBadge(ticket.status)}
                      {getSeverityBadge(ticket.severity)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>#{ticket.ticket_number}</span>
                      <span>{getCategoryLabel(ticket.category)}</span>
                      <span>
                        โดย {ticket.profiles.first_name} {ticket.profiles.last_name}
                      </span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{ticket.description}</p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">ใหม่</option>
                      <option value="acknowledged">รับทราบแล้ว</option>
                      <option value="in_progress">กำลังดำเนินการ</option>
                      <option value="need_info">ต้องการข้อมูลเพิ่มเติม</option>
                      <option value="resolved">แก้ไขแล้ว</option>
                      <option value="closed">ปิดแล้ว</option>
                      <option value="reopened">เปิดใหม่</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
