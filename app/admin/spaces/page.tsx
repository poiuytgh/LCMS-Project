// app/admin/spaces/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { NavAdmin } from "@/components/nav-admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

type Space = {
  id: string;
  code: string;
  name: string;
  type: "office" | "retail" | "warehouse" | "residential";
  description: string | null;
  status: "available" | "occupied" | "maintenance";
  created_at: string;
  updated_at: string;
};

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Space["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Space["type"]>("all");

  // dialog
  const [openCreate, setOpenCreate] = useState(false);

  // ⚠️ แนะนำอ่านสิทธิ์จาก cookie ฝั่ง API แทน แต่คง header เดิมไว้ตามโค้ดคุณ
  const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET ?? ""}` };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/spaces", { headers: authHeader });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSpaces(json.spaces || []);
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูลพื้นที่ล้มเหลว");
    } finally {
      setLoading(false);
    }
  }

  async function createSpace(payload: Omit<Space, "id" | "created_at" | "updated_at">) {
    try {
      const res = await fetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("เพิ่มพื้นที่สำเร็จ");
      setOpenCreate(false);
      reload();
    } catch (e) {
      console.error(e);
      toast.error("เพิ่มพื้นที่ไม่สำเร็จ");
    }
  }

  async function updateSpace(id: string, patch: Partial<Space>) {
    try {
      const res = await fetch(`/api/admin/spaces?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("บันทึกการแก้ไขแล้ว");
      reload();
    } catch (e) {
      console.error(e);
      toast.error("แก้ไขพื้นที่ไม่สำเร็จ");
    }
  }

  async function deleteSpace(id: string) {
    if (!confirm("คุณต้องการลบพื้นที่นี้ใช่ไหม?")) return;
    try {
      const res = await fetch(`/api/admin/spaces?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("ลบพื้นที่แล้ว");
      reload();
    } catch (e) {
      console.error(e);
      toast.error("ลบพื้นที่ไม่สำเร็จ");
    }
  }

  const filtered = useMemo(() => {
    return spaces.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      return true;
    });
  }, [spaces, search, statusFilter, typeFilter]);

  if (loading) return <div className="p-6">กำลังโหลดข้อมูลพื้นที่...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />

      <div className="flex-1 p-6 space-y-6">
        {/* Header + Add button (ขวาบน) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">จัดการพื้นที่</h1>
            <p className="text-sm text-muted-foreground">จัดการข้อมูลพื้นที่เช่าทั้งหมด</p>
          </div>

          <Button onClick={() => setOpenCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            สร้างพื้นที่ใหม่
          </Button>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-3 gap-3">
          <Input
            placeholder="ค้นหาด้วยชื่อ / โค้ด / คำอธิบาย"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="available">ว่าง</SelectItem>
              <SelectItem value="occupied">ใช้งานอยู่</SelectItem>
              <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger><SelectValue placeholder="ทุกประเภท" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="office">สำนักงาน</SelectItem>
              <SelectItem value="retail">ร้านค้า</SelectItem>
              <SelectItem value="warehouse">โกดัง</SelectItem>
              <SelectItem value="residential">ที่อยู่อาศัย</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{s.name}</div>
                <span className="text-xs px-2 py-1 rounded bg-muted capitalize">
                  {s.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                รหัส: {s.code} • {s.type}
              </div>
              {s.description && <div className="text-sm">{s.description}</div>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm"
                  onClick={() => updateSpace(s.id, { status: "maintenance" })}>
                  ตั้งเป็นซ่อมบำรุง
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteSpace(s.id)}>
                  ลบ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateSpaceDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSubmit={createSpace}
      />
    </div>
  );
}

/* ================= Create Dialog ================= */

function CreateSpaceDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (p: Omit<Space, "id" | "created_at" | "updated_at">) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "office" as Space["type"],
    status: "available" as Space["status"],
    description: "",
  });

  const canSubmit = form.code.trim() && form.name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>สร้างพื้นที่ใหม่</DialogTitle>
        </DialogHeader>

        {/* ฟอร์มจัดวางเหมือน modal เพิ่มบิล: สองคอลัมน์ + สรุปด้านล่าง */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">รหัสพื้นที่</Label>
              <Input
                id="code"
                placeholder="เช่น SP-001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">ชื่อพื้นที่</Label>
              <Input
                id="name"
                placeholder="เช่น โซน A ห้อง 101"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as Space["type"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">สำนักงาน</SelectItem>
                  <SelectItem value="retail">ร้านค้า</SelectItem>
                  <SelectItem value="warehouse">โกดัง</SelectItem>
                  <SelectItem value="residential">ที่อยู่อาศัย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as Space["status"] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">ว่าง</SelectItem>
                  <SelectItem value="occupied">ใช้งานอยู่</SelectItem>
                  <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* แถบสรุป/ปุ่มเหมือนตัวอย่างบิล */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() =>
                onSubmit({
                  code: form.code.trim(),
                  name: form.name.trim(),
                  type: form.type,
                  status: form.status,
                  description: form.description.trim() || null,
                })
              }
            >
              บันทึก
            </Button>
          </div>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
