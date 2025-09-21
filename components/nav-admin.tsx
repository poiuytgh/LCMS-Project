"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/components/notification-provider"

export function NavAdmin() {
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useNotifications()

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/admin-logout", { method: "POST" })
      if (response.ok) {
        toast.success("ออกจากระบบสำเร็จ")
        router.push("/login/admin")
      } else {
        toast.error("เกิดข้อผิดพลาดในการออกจากระบบ")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ")
    }
  }

  const navItems = [
    { href: "/admin/dashboard", label: "แดชบอร์ด" },
    { href: "/admin/contracts", label: "สัญญาเช่า" },
    { href: "/admin/spaces", label: "พื้นที่" },
    { href: "/admin/bills", label: "บิลค่าเช่า" },
    { href: "/admin/support", label: "ปัญหาการใช้งาน" },
    { href: "/admin/reports", label: "รายงาน/สถิติ" },
    { href: "/admin/profile", label: "โปรไฟล์" },
  ]

  return (
    <nav className="bg-secondary border-b border-gray-700 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-2 py-1 text-sm font-medium transition-colors",
                    isActive
                      ? "text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Right side - Notifications and Logout */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative text-gray-300 hover:text-white transition">
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
                  <p className="text-sm text-muted-foreground">
                    ไม่มีการแจ้งเตือนใหม่
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
