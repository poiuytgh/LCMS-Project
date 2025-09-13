"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function NavAdmin() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/admin-logout", { method: "POST" })
      if (response.ok) {
        toast.success("ออกจากระบบสำเร็จ")
        router.push("/")
      } else {
        toast.error("เกิดข้อผิดพลาดในการออกจากระบบ")
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ")
    }
  }

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/contracts", label: "สัญญาเช่า" },
    { href: "/admin/spaces", label: "พื้นที่" },
    { href: "/admin/bills", label: "บิลค่าเช่า" },
    { href: "/admin/support", label: "ปัญหาการใช้งาน" },
    { href: "/admin/reports", label: "รายงาน/สถิติ" },
    { href: "/admin/profile", label: "โปรไฟล์" },
  ]

  return (
    <nav className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium hover:text-accent transition-colors",
                  pathname === item.href && "text-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side - Notifications and Logout */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-secondary-foreground hover:text-accent">
                  <Bell className="h-4 w-4" />
                  <span className="ml-2">การแจ้งเตือน</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4">
                  <h3 className="font-semibold mb-2">การแจ้งเตือนผู้ดูแล</h3>
                  <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-secondary-foreground hover:text-accent"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2">ออกจากระบบ</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
