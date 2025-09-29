"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NavAdmin } from "@/components/nav-admin";
import { CreditCard, Eye, Search, Filter, Plus, Pencil, Trash2, Download, Check, X } from "lucide-react";
import { toast } from "sonner";
import { DialogDescription } from "@radix-ui/react-dialog";

type BillRecord = {
  id: string;
  billing_month: string;
  rent_amount: number;
  water_previous_reading: number;
  water_current_reading: number;
  water_unit_rate: number;
  water_amount: number;
  power_previous_reading: number;
  power_current_reading: number;
  power_unit_rate: number;
  power_amount: number;
  internet_amount: number;
  other_charges: number;
  total_amount: number;
  status: "paid" | "pending" | "unpaid" | string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
  tenant_name: string;
  space_name: string;
  space_code: string;
};

type MinimalContract = {
  id: string;
  tenant_name: string;
  space_name: string;
  space_code: string;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0));
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}
function formatMonth(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}
function isOverdue(d: string, status: string) {
  return status === "unpaid" && new Date(d) < new Date();
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-green-600 text-white">ชำระแล้ว</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500 text-white">รอตรวจสอบ</Badge>;
  if (status === "unpaid") return <Badge variant="destructive">ค้างชำระ</Badge>;
  return <Badge>{status}</Badge>;
}

function authHeader(): HeadersInit {
  const devSecret = process.env.NEXT_PUBLIC_ADMIN_SEED_SECRET;
  return devSecret ? { Authorization: `Bearer ${devSecret}` } : {};
}

export default function AdminBillsPage() {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [contracts, setContracts] = useState<MinimalContract[]>([]);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    contractId: "",
    month: "", // yyyy-MM
    rent_amount: 0,
    water_prev: 0,
    water_curr: 0,
    water_rate: 0,
    power_prev: 0,
    power_curr: 0,
    power_rate: 0,
    internet_amount: 0,
    other_charges: 0,
    due_date: "", // yyyy-MM-dd
  });

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({
    id: "",
    month: "", // yyyy-MM
    rent_amount: 0,
    water_prev: 0,
    water_curr: 0,
    water_rate: 0,
    power_prev: 0,
    power_curr: 0,
    power_rate: 0,
    internet_amount: 0,
    other_charges: 0,
    due_date: "",
    status: "unpaid" as "paid" | "pending" | "unpaid",
  });

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openCreate) fetchMinimalContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreate]);

  async function fetchBills() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bills", {
        headers: { ...authHeader() },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "ไม่สามารถดึงข้อมูลบิลได้");
      setBills(json.bills || json.data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "ไม่สามารถดึงข้อมูลบิลได้");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMinimalContracts() {
    try {
      const res = await fetch("/api/admin/contracts/minimal", {
        headers: { ...authHeader() },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "โหลดรายชื่อสัญญาไม่สำเร็จ");
      setContracts(json.contracts || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "โหลดรายชื่อสัญญาไม่สำเร็จ");
    }
  }

  const filtered = useMemo(() => {
    let items = bills;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((b) => {
        const who = (b.tenant_name || "").toLowerCase();
        const spaceLabel = `${b.space_name || ""} ${b.space_code || ""}`.toLowerCase();
        const monthStr = new Date(b.billing_month).toLocaleDateString("th-TH", { month: "long", year: "numeric" }).toLowerCase();
        return who.includes(q) || spaceLabel.includes(q) || monthStr.includes(q);
      });
    }
    if (statusFilter !== "all") items = items.filter((b) => b.status === statusFilter);
    return items;
  }, [bills, search, statusFilter]);

  // ---------- CREATE ----------
  function computeCreate() {
    const waterUnits = Math.max(0, Number(form.water_curr) - Number(form.water_prev));
    const powerUnits = Math.max(0, Number(form.power_curr) - Number(form.power_prev));
    const water_amount = waterUnits * Number(form.water_rate);
    const power_amount = powerUnits * Number(form.power_rate);
    const total =
      Number(form.rent_amount) + Number(form.internet_amount) + Number(form.other_charges) + water_amount + power_amount;
    return { waterUnits, powerUnits, water_amount, power_amount, total };
  }
  const { waterUnits, powerUnits, water_amount, power_amount, total } = computeCreate();

  async function handleCreate() {
    try {
      if (!form.contractId) return toast.error("กรุณาเลือกสัญญา");
      if (!form.month) return toast.error("กรุณาเลือกเดือนบิล");
      if (!form.due_date) return toast.error("กรุณากำหนดวันครบกำหนดชำระ");

      setCreating(true);
      const payload = {
        contract_id: form.contractId,
        billing_month: `${form.month}-01`,
        rent_amount: Number(form.rent_amount || 0),
        water_previous_reading: Number(form.water_prev || 0),
        water_current_reading: Number(form.water_curr || 0),
        water_unit_rate: Number(form.water_rate || 0),
        power_previous_reading: Number(form.power_prev || 0),
        power_current_reading: Number(form.power_curr || 0),
        power_unit_rate: Number(form.power_rate || 0),
        internet_amount: Number(form.internet_amount || 0),
        other_charges: Number(form.other_charges || 0),
        due_date: form.due_date,
      };

      const res = await fetch("/api/admin/bills", {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "สร้างบิลไม่สำเร็จ");

      toast.success("สร้างบิลสำเร็จ");
      setOpenCreate(false);
      setForm({
        contractId: "",
        month: "",
        rent_amount: 0,
        water_prev: 0,
        water_curr: 0,
        water_rate: 0,
        power_prev: 0,
        power_curr: 0,
        power_rate: 0,
        internet_amount: 0,
        other_charges: 0,
        due_date: "",
      });
      fetchBills();
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setCreating(false);
    }
  }

  // ---------- EDIT ----------
  function openEditWith(b: BillRecord) {
    setEdit({
      id: b.id,
      month: b.billing_month.slice(0, 7),
      rent_amount: b.rent_amount,
      water_prev: b.water_previous_reading,
      water_curr: b.water_current_reading,
      water_rate: b.water_unit_rate,
      power_prev: b.power_previous_reading,
      power_curr: b.power_current_reading,
      power_rate: b.power_unit_rate,
      internet_amount: b.internet_amount,
      other_charges: b.other_charges,
      due_date: b.due_date.slice(0, 10),
      status: (b.status as "paid" | "pending" | "unpaid") ?? "unpaid",
    });
    setOpenEdit(true);
  }

  function computeEdit() {
    const wUnits = Math.max(0, Number(edit.water_curr) - Number(edit.water_prev));
    const pUnits = Math.max(0, Number(edit.power_curr) - Number(edit.power_prev));
    const wAmt = wUnits * Number(edit.water_rate);
    const pAmt = pUnits * Number(edit.power_rate);
    const total = Number(edit.rent_amount) + Number(edit.internet_amount) + Number(edit.other_charges) + wAmt + pAmt;
    return { wUnits, pUnits, wAmt, pAmt, total };
  }
  const { wUnits, pUnits, wAmt, pAmt, total: editTotal } = computeEdit();

  async function handleEditSave() {
    try {
      setEditing(true);
      const payload = {
        billing_month: `${edit.month}-01`,
        rent_amount: Number(edit.rent_amount),
        water_previous_reading: Number(edit.water_prev),
        water_current_reading: Number(edit.water_curr),
        water_unit_rate: Number(edit.water_rate),
        power_previous_reading: Number(edit.power_prev),
        power_current_reading: Number(edit.power_curr),
        power_unit_rate: Number(edit.power_rate),
        internet_amount: Number(edit.internet_amount),
        other_charges: Number(edit.other_charges),
        due_date: edit.due_date,
        status: edit.status,
      };
      const res = await fetch(`/api/admin/bills/${edit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "แก้ไขบิลไม่สำเร็จ");

      toast.success("บันทึกการแก้ไขเรียบร้อย");
      setOpenEdit(false);
      fetchBills();
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการแก้ไข");
    } finally {
      setEditing(false);
    }
  }

  // ---------- DELETE ----------
  async function handleDelete(id: string) {
    const ok = window.confirm("ต้องการลบบิลนี้ใช่หรือไม่?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/bills/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "ลบบิลไม่สำเร็จ");
      toast.success("ลบบิลเรียบร้อย");
      setBills((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการลบ");
    }
  }

  // ---------- VERIFY (Approve / Reject) ----------
  async function approveBill(id: string) {
    try {
      const ok = window.confirm("ยืนยันการชำระบิลนี้ใช่หรือไม่?");
      if (!ok) return;
      const res = await fetch(`/api/admin/bills/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ decision: "approve" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "อนุมัติไม่สำเร็จ");
      toast.success("ยืนยันชำระเรียบร้อย • ได้แจ้งผู้เช่าแล้ว");
      fetchBills();
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการยืนยันชำระ");
    }
  }

  async function rejectBill(id: string) {
    try {
      const reason = window.prompt("เหตุผลในการปฏิเสธ (optional):", "") || undefined;
      const res = await fetch(`/api/admin/bills/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ decision: "reject", reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "ปฏิเสธไม่สำเร็จ");
      toast.success("ปฏิเสธการชำระเรียบร้อย • ได้แจ้งผู้เช่าแล้ว");
      fetchBills();
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาดในการปฏิเสธ");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูลบิล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavAdmin />
      <div className="flex-1 p-6 bg-muted/30">
        <div className="container mx-auto">
          {/* Header + Create */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">จัดการบิลค่าเช่า</h1>
              <p className="text-muted-foreground">เพิ่มบิลใหม่ ดูรายการ แก้ไข ลบ และตรวจสอบการชำระเงิน</p>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  สร้างบิลใหม่
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>สร้างบิลค่าเช่าใหม่</DialogTitle>
                  <DialogDescription>กรอกข้อมูลเพื่อสร้างบิลใหม่</DialogDescription>
                </DialogHeader>

                {/* Create form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">สัญญา</label>
                    <Select value={form.contractId} onValueChange={(v) => setForm((s) => ({ ...s, contractId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผู้เช่า · พื้นที่" />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.tenant_name} · {c.space_name} ({c.space_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">เดือนบิล</label>
                    <Input
                      type="month"
                      value={form.month}
                      onChange={(e) => setForm((s) => ({ ...s, month: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">ครบกำหนดชำระ</label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">ค่าเช่า</label>
                    <Input
                      type="number"
                      value={form.rent_amount}
                      onChange={(e) => setForm((s) => ({ ...s, rent_amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">อินเทอร์เน็ต</label>
                    <Input
                      type="number"
                      value={form.internet_amount}
                      onChange={(e) => setForm((s) => ({ ...s, internet_amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">ค่าอื่น ๆ</label>
                    <Input
                      type="number"
                      value={form.other_charges}
                      onChange={(e) => setForm((s) => ({ ...s, other_charges: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">น้ำ (มิเตอร์ก่อน)</label>
                      <Input
                        type="number"
                        value={form.water_prev}
                        onChange={(e) => setForm((s) => ({ ...s, water_prev: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">น้ำ (มิเตอร์ปัจจุบัน)</label>
                      <Input
                        type="number"
                        value={form.water_curr}
                        onChange={(e) => setForm((s) => ({ ...s, water_curr: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">น้ำ (บาท/หน่วย)</label>
                      <Input
                        type="number"
                        value={form.water_rate}
                        onChange={(e) => setForm((s) => ({ ...s, water_rate: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full text-right text-sm">
                        <div>
                          หน่วย: <b>{waterUnits}</b>
                        </div>
                        <div>
                          เป็นเงิน: <b>{formatCurrency(water_amount)}</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">ไฟ (มิเตอร์ก่อน)</label>
                      <Input
                        type="number"
                        value={form.power_prev}
                        onChange={(e) => setForm((s) => ({ ...s, power_prev: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">ไฟ (มิเตอร์ปัจจุบัน)</label>
                      <Input
                        type="number"
                        value={form.power_curr}
                        onChange={(e) => setForm((s) => ({ ...s, power_curr: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">ไฟ (บาท/หน่วย)</label>
                      <Input
                        type="number"
                        value={form.power_rate}
                        onChange={(e) => setForm((s) => ({ ...s, power_rate: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full text-right text-sm">
                        <div>
                          หน่วย: <b>{powerUnits}</b>
                        </div>
                        <div>
                          เป็นเงิน: <b>{formatCurrency(power_amount)}</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t pt-3 flex justify-between items-center text-lg font-bold">
                    <span>ยอดรวมทั้งสิ้น:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? "กำลังบันทึก..." : "บันทึกบิล"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search & Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="ค้นหาผู้เช่า/พื้นที่/เดือน..."
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
                      <SelectItem value="unpaid">ค้างชำระ</SelectItem>
                      <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                      <SelectItem value="paid">ชำระแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchBills}>รีเฟรช</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.length > 0 ? (
              filtered.map((b) => (
                <Card
                  key={b.id}
                  className={`hover:shadow-lg transition-shadow ${
                    isOverdue(b.due_date, b.status) ? "border-red-200 bg-red-50/50" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">บิล {formatMonth(b.billing_month)}</CardTitle>
                        <CardDescription className="mt-1">
                          {b.tenant_name || "ผู้เช่าไม่ทราบ"} · {b.space_name} ({b.space_code})
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={b.status} />
                        {isOverdue(b.due_date, b.status) && (
                          <Badge variant="destructive" className="mt-1 block">
                            เกินกำหนด
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ค่าเช่า:</span>
                          <p className="font-medium">{formatCurrency(b.rent_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">รวมชำระ:</span>
                          <p className="font-bold">{formatCurrency(b.total_amount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">กำหนดชำระ:</span>
                          <p className={isOverdue(b.due_date, b.status) ? "text-red-600 font-medium" : ""}>
                            {formatDate(b.due_date)}
                          </p>
                        </div>
                        {b.paid_date && (
                          <div>
                            <span className="text-muted-foreground">วันที่ชำระ:</span>
                            <p>{formatDate(b.paid_date)}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4">
                        {/* View */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-transparent"
                              onClick={() => setSelectedBill(b)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              ดูรายละเอียด
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>รายละเอียดบิล</DialogTitle>
                            </DialogHeader>
                            {selectedBill && <BillDetail bill={selectedBill} />}
                          </DialogContent>
                        </Dialog>

                        {/* Edit */}
                        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="flex-1" variant="secondary" onClick={() => openEditWith(b)}>
                              <Pencil className="h-4 w-4 mr-1" />
                              แก้ไข
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>แก้ไขบิล</DialogTitle>
                              <DialogDescription>อัปเดตตัวเลข/สถานะของบิลนี้</DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-muted-foreground">เดือนบิล</label>
                                <Input
                                  type="month"
                                  value={edit.month}
                                  onChange={(e) => setEdit((s) => ({ ...s, month: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">ครบกำหนด</label>
                                <Input
                                  type="date"
                                  value={edit.due_date}
                                  onChange={(e) => setEdit((s) => ({ ...s, due_date: e.target.value }))}
                                />
                              </div>

                              <div>
                                <label className="text-sm text-muted-foreground">สถานะ</label>
                                <Select
                                  value={edit.status}
                                  onValueChange={(v: any) => setEdit((s) => ({ ...s, status: v }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="สถานะ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unpaid">ค้างชำระ</SelectItem>
                                    <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                                    <SelectItem value="paid">ชำระแล้ว</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div />

                              <div>
                                <label className="text-sm text-muted-foreground">ค่าเช่า</label>
                                <Input
                                  type="number"
                                  value={edit.rent_amount}
                                  onChange={(e) => setEdit((s) => ({ ...s, rent_amount: Number(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">อินเทอร์เน็ต</label>
                                <Input
                                  type="number"
                                  value={edit.internet_amount}
                                  onChange={(e) => setEdit((s) => ({ ...s, internet_amount: Number(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">ค่าอื่น ๆ</label>
                                <Input
                                  type="number"
                                  value={edit.other_charges}
                                  onChange={(e) => setEdit((s) => ({ ...s, other_charges: Number(e.target.value) }))}
                                />
                              </div>

                              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-sm text-muted-foreground">น้ำ (ก่อน)</label>
                                  <Input
                                    type="number"
                                    value={edit.water_prev}
                                    onChange={(e) => setEdit((s) => ({ ...s, water_prev: Number(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">น้ำ (ปัจจุบัน)</label>
                                  <Input
                                    type="number"
                                    value={edit.water_curr}
                                    onChange={(e) => setEdit((s) => ({ ...s, water_curr: Number(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">น้ำ (บาท/หน่วย)</label>
                                  <Input
                                    type="number"
                                    value={edit.water_rate}
                                    onChange={(e) => setEdit((s) => ({ ...s, water_rate: Number(e.target.value) }))}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <div className="w-full text-right text-sm">
                                    <div>
                                      หน่วย: <b>{wUnits}</b>
                                    </div>
                                    <div>
                                      เป็นเงิน: <b>{formatCurrency(wAmt)}</b>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-sm text-muted-foreground">ไฟ (ก่อน)</label>
                                  <Input
                                    type="number"
                                    value={edit.power_prev}
                                    onChange={(e) => setEdit((s) => ({ ...s, power_prev: Number(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">ไฟ (ปัจจุบัน)</label>
                                  <Input
                                    type="number"
                                    value={edit.power_curr}
                                    onChange={(e) => setEdit((s) => ({ ...s, power_curr: Number(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">ไฟ (บาท/หน่วย)</label>
                                  <Input
                                    type="number"
                                    value={edit.power_rate}
                                    onChange={(e) => setEdit((s) => ({ ...s, power_rate: Number(e.target.value) }))}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <div className="w-full text-right text-sm">
                                    <div>
                                      หน่วย: <b>{pUnits}</b>
                                    </div>
                                    <div>
                                      เป็นเงิน: <b>{formatCurrency(pAmt)}</b>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="md:col-span-2 border-t pt-3 flex justify-between items-center text-lg font-bold">
                                <span>ยอดรวมทั้งสิ้น (คำนวณใหม่):</span>
                                <span className="text-primary">{formatCurrency(editTotal)}</span>
                              </div>

                              <div className="md:col-span-2 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpenEdit(false)}>
                                  ยกเลิก
                                </Button>
                                <Button onClick={handleEditSave} disabled={editing}>
                                  {editing ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Delete */}
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          ลบ
                        </Button>

                        {/* Approve / Reject */}
                        <Button size="sm" className="flex-1" onClick={() => approveBill(b.id)} variant="default">
                          <Check className="h-4 w-4 mr-1" />
                          ยืนยันชำระ
                        </Button>
                        <Button size="sm" className="flex-1" variant="outline" onClick={() => rejectBill(b.id)}>
                          <X className="h-4 w-4 mr-1" />
                          ปฏิเสธ
                        </Button>

                        {/* Receipt (admin) */}
                        {b.status === "paid" && (
                          <Button asChild size="sm" variant="outline" className="flex-1 bg-transparent">
                            <a href={`/api/admin/bills/${b.id}/receipt`} target="_blank" rel="noopener">
                              <Download className="h-4 w-4 mr-1" />
                              ใบเสร็จ
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบบิล</h3>
                  <p className="text-muted-foreground">
                    {search || statusFilter !== "all" ? "ลองปรับตัวกรองหรือคำค้นหา" : "ยังไม่มีข้อมูลบิลในระบบ"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillDetail({ bill }: { bill: BillRecord }) {
  const usage = (curr: number, prev: number) => curr - prev;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">ค่าเช่าพื้นที่:</span>
          <p className="font-medium text-right">{formatCurrency(bill.rent_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">
            ค่าน้ำ ({usage(bill.water_current_reading, bill.water_previous_reading)} หน่วย):
          </span>
          <p className="font-medium text-right">{formatCurrency(bill.water_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">
            ค่าไฟ ({usage(bill.power_current_reading, bill.power_previous_reading)} หน่วย):
          </span>
          <p className="font-medium text-right">{formatCurrency(bill.power_amount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">อินเทอร์เน็ต/อื่นๆ:</span>
          <p className="font-medium text-right">{formatCurrency(bill.internet_amount + bill.other_charges)}</p>
        </div>
      </div>
      <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
        <span>รวมทั้งสิ้น:</span>
        <span className="text-primary">{formatCurrency(bill.total_amount)}</span>
      </div>
      <div className="bg-muted p-3 rounded text-sm">
        <div className="flex justify-between">
          <span>กำหนดชำระ:</span>
          <span>{formatDate(bill.due_date)}</span>
        </div>
        {bill.paid_date && (
          <div className="flex justify-between">
            <span>วันที่ชำระ:</span>
            <span>{formatDate(bill.paid_date)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>สถานะ:</span>
          <span>
            {bill.status === "paid" && "ชำระแล้ว"}
            {bill.status === "pending" && "รอตรวจสอบ"}
            {bill.status === "unpaid" && "ค้างชำระ"}
          </span>
        </div>
      </div>
    </div>
  );
}
