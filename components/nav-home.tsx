"use client"

import Link from "next/link"
import { Bell, LayoutDashboard, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useNotifications } from "@/components/notification-provider"

export function NavHome() {
  const { user } = useAuth()
  const { unreadCount } = useNotifications()

  return (
    <nav className="bg-secondary text-secondary-foreground shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium hover:text-accent transition-colors">
              หน้าหลัก
            </Link>
            <Link href="/dashboard/contracts" className="text-sm font-medium hover:text-accent transition-colors">
              สัญญาเช่า
            </Link>
            <Link href="/dashboard/bills" className="text-sm font-medium hover:text-accent transition-colors">
              บิลค่าเช่า
            </Link>
            <Link href="/dashboard/support" className="text-sm font-medium hover:text-accent transition-colors">
              แจ้งปัญหาการใช้งาน
            </Link>
            <Link href="/dashboard/profile" className="text-sm font-medium hover:text-accent transition-colors">
              โปรไฟล์
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {user ? (
              <Button
                asChild
                size="sm"
                className="flex items-center gap-2 bg-transparent hover:bg-accent hover:text-white"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" /> ไปแดชบอร์ด
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="flex items-center gap-2 bg-transparent hover:bg-accent hover:text-white"
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4" /> เข้าสู่ระบบ
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span>การแจ้งเตือน</span>
              {user && unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-xs">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
