"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavAdmin } from "@/components/nav-admin";
import {
  FileText,
  Building2,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  contracts: {
    total: number;
    active: number;
    expiring: number;
    expired: number;
  };
  spaces: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
  };
  finance: {
    monthlyRevenue: number;
    paid: number;
    unpaid: number;
    pending: number;
  };
  support: {
    new: number;
    needInfo: number;
    overdue: number;
    total: number;
  };
}

interface ExpiringContract {
  id: string;
  tenant_name: string;
  space_name: string;
  end_date: string;
}

interface OverdueBill {
  id: string;
  tenant_name: string;
  space_name: string;
  total_amount: number;
  due_date: string;
}

type SummaryResponse = {
  contracts: DashboardStats["contracts"];
  spaces: DashboardStats["spaces"];
  finance: DashboardStats["finance"];
  support: DashboardStats["support"];
  expiringContracts: ExpiringContract[];
  overdueBills: OverdueBill[];
  error?: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    contracts: { total: 0, active: 0, expiring: 0, expired: 0 },
    spaces: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    finance: { monthlyRevenue: 0, paid: 0, unpaid: 0, pending: 0 },
    support: { new: 0, needInfo: 0, overdue: 0, total: 0 },
  });
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [overdueBills, setOverdueBills] = useState<OverdueBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard/summary", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });

        // ไม่มีคุกกี้แอดมินหรือหมดอายุ → กลับหน้า login/admin
        if (res.status === 401 || res.status === 403) {
          router.replace("/login/admin");
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data: SummaryResponse = await res.json();

        setStats({
          contracts: data.contracts,
          spaces: data.spaces,
          finance: data.finance,
          support: data.support,
        });
        setExpiringContracts(data.expiringContracts || []);
        setOverdueBills(data.overdueBills || []);
      } catch (err: any) {
        if (ac.signal.aborted) return; // เผื่อ unmount ไปแล้ว
        console.error("Error fetching dashboard data:", err);
        // ถ้าเป็น network/อื่นๆ ให้แจ้งเตือน
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [router]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavAdmin />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>กำลังโหลดข้อมูล...</p>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">ภาพรวมการจัดการระบบสัญญาเช่าพื้นที่</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Contracts Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">สัญญาเช่า</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contracts.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge variant="secondary">{stats.contracts.active} ใช้งาน</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.contracts.expiring} ใกล้หมด
                  </Badge>
                  <Badge variant="destructive">{stats.contracts.expired} หมดอายุ</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Spaces Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">พื้นที่</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.spaces.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-green-100 text-green-800">{stats.spaces.available} ว่าง</Badge>
                  <Badge variant="secondary">{stats.spaces.occupied} ใช้งาน</Badge>
                  <Badge className="bg-orange-100 text-orange-800">{stats.spaces.maintenance} ซ่อม</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Finance Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">รายได้เดือนนี้</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.finance.monthlyRevenue)}
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-green-100 text-green-800">{stats.finance.paid} ชำระแล้ว</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.finance.pending} รอตรวจ</Badge>
                  <Badge variant="destructive">{stats.finance.unpaid} ค้างชำระ</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Support Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ปัญหาการใช้งาน</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.support.total}</div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge className="bg-blue-100 text-blue-800">{stats.support.new} ใหม่</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.support.needInfo} ต้องข้อมูล</Badge>
                  <Badge variant="destructive">{stats.support.overdue} เกินกำหนด</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Expiring Contracts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  สัญญาใกล้หมดอายุ (5 อันดับแรก)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringContracts.length > 0 ? (
                  <div className="space-y-3">
                    {expiringContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                      >
                        <div>
                          <p className="font-medium text-sm">{contract.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{contract.space_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-700">
                            {formatDate(contract.end_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    ไม่มีสัญญาที่ใกล้หมดอายุ
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Overdue Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  บิลค้างชำระ (5 อันดับแรก)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueBills.length > 0 ? (
                  <div className="space-y-3">
                    {overdueBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                      >
                        <div>
                          <p className="font-medium text-sm">{bill.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{bill.space_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-700">
                            {formatCurrency(bill.total_amount)}
                          </p>
                          <p className="text-xs text-red-600">เกิน {formatDate(bill.due_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    ไม่มีบิลค้างชำระ
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                รายได้รายเดือน
              </CardTitle>
              <CardDescription>กราฟแสดงรายได้ในช่วง 12 เดือนที่ผ่านมา</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">กราฟรายได้จะแสดงที่นี่</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ใช้ Recharts หรือ Chart.js สำหรับการแสดงผล
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
