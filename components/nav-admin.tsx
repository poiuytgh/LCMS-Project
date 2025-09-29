"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/notification-provider";
import { useEffect, useMemo, useState } from "react";

const LS_NAME = "admin:name";
const LS_AVATAR = "admin:avatar";

type NavAdminProps = {
  adminName?: string;
  avatarUrl?: string;
};

function getInitials(name?: string) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NavAdmin({ adminName, avatarUrl }: NavAdminProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const [name, setName] = useState<string>(adminName || "ผู้ดูแลระบบ");
  const [avatar, setAvatar] = useState<string>(avatarUrl || "");

  // โหลดจาก localStorage + ฟังอัปเดตสด
  useEffect(() => {
    const load = () => {
      try {
        const n = adminName ?? (typeof window !== "undefined" ? localStorage.getItem(LS_NAME) : null) ?? "ผู้ดูแลระบบ";
        const a = avatarUrl ?? (typeof window !== "undefined" ? localStorage.getItem(LS_AVATAR) : null) ?? "";
        setName(n);
        setAvatar(a);
      } catch {
        // ignore
      }
    };
    load();

    const onUpdated = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("admin-profile-updated", onUpdated as EventListener);
      window.addEventListener("storage", onUpdated as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("admin-profile-updated", onUpdated as EventListener);
        window.removeEventListener("storage", onUpdated as EventListener);
      }
    };
  }, [adminName, avatarUrl]);

  const initials = useMemo(() => getInitials(name), [name]);
  const avatarSrc = avatar || "";

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/admin/admin-logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "เกิดข้อผิดพลาดในการออกจากระบบ");
        return;
      }

      // เคลียร์ค่า client-side กัน UI ค้าง
      try {
        localStorage.removeItem(LS_NAME);
        localStorage.removeItem(LS_AVATAR);
      } catch {
        // ignore
      }

      toast.success("ออกจากระบบสำเร็จ");
      router.replace("/login/admin");
    } catch {
      toast.error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  const navItems = [
    { href: "/admin/dashboard", label: "แดชบอร์ด" },
    { href: "/admin/contracts", label: "สัญญาเช่า" },
    { href: "/admin/spaces", label: "พื้นที่" },
    { href: "/admin/bills", label: "บิลค่าเช่า" },
    { href: "/admin/payment-slips", label: "สลิปชำระเงิน" },
    { href: "/admin/support", label: "ปัญหาการใช้งาน" },
    { href: "/admin/reports", label: "รายงาน/สถิติ" },
    { href: "/admin/profile", label: "โปรไฟล์" },
  ];

  // ใช้ startsWith เพื่อให้เมนู active เมื่อตรงเส้นทางย่อยด้วย
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="bg-secondary border-b border-gray-700 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2 py-1 text-sm font-medium transition-colors",
                  isActive(item.href) ? "text-white font-semibold" : "text-gray-400 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side - Notifications & Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative text-gray-300 hover:text-white transition"
                  aria-label="เปิดการแจ้งเตือน"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">การแจ้งเตือนผู้ดูแล</h3>
                  <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="เปิดเมนูโปรไฟล์">
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    {/* ใช้ key เพื่อรีเฟรชรูปทันทีเมื่อ URL เปลี่ยน */}
                    <AvatarImage key={avatarSrc || "no-avatar"} src={avatarSrc} className="object-cover" />
                    <AvatarFallback className="bg-muted text-gray-900 text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 p-1 rounded-xl border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80 shadow-lg"
              >
                <DropdownMenuItem
                  asChild
                  className="rounded-lg px-3 py-2 text-sm hover:bg-muted data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
                >
                  <Link href="/admin/profile">โปรไฟล์ผู้ดูแล</Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="
                    rounded-lg px-3 py-2 text-sm
                    text-red-600
                    hover:bg-red-50 dark:hover:bg-red-950/30
                    data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/30
                    data-[highlighted]:text-red-600
                  "
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
