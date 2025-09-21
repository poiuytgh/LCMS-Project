"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

type Space = {
  id: string
  code: string
  name: string
  type: "office" | "retail" | "warehouse" | "residential"
  description: string | null
  status: "available" | "occupied" | "maintenance"
  created_at: string
  updated_at: string
}

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | Space["status"]>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | Space["type"]>("all")

  // ✅ ดึงข้อมูลผ่าน API route (server-side)
  const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET ?? ""}` }
  // ^ ถ้าไม่อยาก expose secret ใน client:
  // - ให้ backend อ่านจาก cookie แทน (แนะนำ)
  // - หรือเก็บไว้ใน env ของ runtime edge ที่คุณควบคุม (อย่า commit)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/spaces", { headers: authHeader })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setSpaces(json.spaces || [])
      } catch (e: any) {
        console.error(e)
        toast.error("โหลดข้อมูลพื้นที่ล้มเหลว")
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return spaces.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const hit =
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
        if (!hit) return false
      }
      if (statusFilter !== "all" && s.status !== statusFilter) return false
      if (typeFilter !== "all" && s.type !== typeFilter) return false
      return true
    })
  }, [spaces, search, statusFilter, typeFilter])

  async function createSpace(payload: Omit<Space, "id" | "created_at" | "updated_at">) {
    try {
      const res = await fetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("เพิ่มพื้นที่สำเร็จ")
      reload()
    } catch (e: any) {
      console.error(e)
      toast.error("เพิ่มพื้นที่ไม่สำเร็จ")
    }
  }

  async function updateSpace(id: string, patch: Partial<Space>) {
    try {
      const res = await fetch(`/api/admin/spaces?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("บันทึกการแก้ไขแล้ว")
      reload()
    } catch (e: any) {
      console.error(e)
      toast.error("แก้ไขพื้นที่ไม่สำเร็จ")
    }
  }

  async function deleteSpace(id: string) {
    if (!confirm("คุณต้องการลบพื้นที่นี้ใช่ไหม?")) return
    try {
      const res = await fetch(`/api/admin/spaces?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("ลบพื้นที่แล้ว")
      reload()
    } catch (e: any) {
      console.error(e)
      toast.error("ลบพื้นที่ไม่สำเร็จ")
    }
  }

  async function reload() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/spaces", { headers: authHeader })
      const json = await res.json()
      setSpaces(json.spaces || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">กำลังโหลดข้อมูลพื้นที่...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">จัดการพื้นที่</h1>
        <p className="text-sm text-gray-500">จัดการข้อมูลพื้นที่เช่าทั้งหมด</p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-3">
        <input
          placeholder="ค้นหาด้วยชื่อ / โค้ด / คำอธิบาย"
          className="border rounded px-3 py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="available">ว่าง</option>
          <option value="occupied">ใช้งานอยู่</option>
          <option value="maintenance">ซ่อมบำรุง</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option value="all">ทุกประเภท</option>
          <option value="office">สำนักงาน</option>
          <option value="retail">ร้านค้า</option>
          <option value="warehouse">โกดัง</option>
          <option value="residential">ที่อยู่อาศัย</option>
        </select>
      </div>

      {/* List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="border rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{s.name}</div>
              <span className="text-xs px-2 py-1 rounded bg-gray-100">{s.status}</span>
            </div>
            <div className="text-sm text-gray-600">รหัส: {s.code} • {s.type}</div>
            {s.description && <div className="text-sm">{s.description}</div>}
            <div className="flex gap-2 pt-2">
              <button className="px-3 py-1 border rounded" onClick={() => updateSpace(s.id, { status: "maintenance" })}>
                ตั้งเป็นซ่อมบำรุง
              </button>
              <button className="px-3 py-1 border rounded" onClick={() => deleteSpace(s.id)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {/* ตัวอย่างฟอร์มเพิ่ม (อย่างง่าย) */}
      <CreateForm onCreate={(payload) => createSpace(payload as any)} />
    </div>
  )
}

function CreateForm({ onCreate }: { onCreate: (p: Omit<Space, "id" | "created_at" | "updated_at">) => void }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "office",
    description: "",
    status: "available",
  })
  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-medium">เพิ่มพื้นที่ใหม่</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2" placeholder="รหัส" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="ชื่อพื้นที่" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="border rounded px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="office">สำนักงาน</option>
          <option value="retail">ร้านค้า</option>
          <option value="warehouse">โกดัง</option>
          <option value="residential">ที่อยู่อาศัย</option>
        </select>
        <select className="border rounded px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="available">ว่าง</option>
          <option value="occupied">ใช้งานอยู่</option>
          <option value="maintenance">ซ่อมบำรุง</option>
        </select>
      </div>
      <textarea className="border rounded w-full px-3 py-2" placeholder="คำอธิบาย (ถ้ามี)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button className="px-4 py-2 border rounded" onClick={() => onCreate({ ...form, description: form.description || null } as any)}>บันทึก</button>
    </div>
  )
}
