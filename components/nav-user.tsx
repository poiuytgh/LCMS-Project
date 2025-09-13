"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { useNotifications } from "@/components/notification-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function NavUser() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { notifications, unreadCount, markAsRead } = useNotifications()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("ออกจากระบบสำเร็จ")
      router.push("/")
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ")
    }
  }

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/contracts", label: "สัญญาของฉัน" },
    { href: "/dashboard/bills", label: "บิลค่าเช่า" },
    { href: "/dashboard/support", label: "แจ้งปัญหาการใช้งาน" },
    { href: "/dashboard/profile", label: "โปรไฟล์" },
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
                <Button variant="ghost" size="sm" className="text-secondary-foreground hover:text-accent relative">
                  <Bell className="h-4 w-4" />
                  <span className="ml-2">การแจ้งเตือน</span>
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">การแจ้งเตือน</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                        อ่านทั้งหมด
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notification) => (
                      <DropdownMenuItem key={notification.id} className="p-4 cursor-pointer">
                        <div className="flex items-start space-x-3 w-full">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.created_at)}</p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">ไม่มีการแจ้งเตือน</div>
                  )}
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
