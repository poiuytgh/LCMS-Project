"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NavHome() {
  return (
    <nav className="bg-secondary text-secondary-foreground shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/contracts"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              สัญญาเช่า
            </Link>
            <Link
              href="/bills"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              บิลค่าเช่า
            </Link>
            <Link
              href="/support"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              แจ้งปัญหาการใช้งาน
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              โปรไฟล์
            </Link>
          </div>

          {/* Right side - Notifications */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span>การแจ้งเตือน</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
