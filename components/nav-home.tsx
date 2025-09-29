"use client"

import Link from "next/link"
import { LayoutDashboard, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"

export function NavHome() {
  const { user } = useAuth()

  return (
    <nav className="shadow-md bg-[#212121]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Branding */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-lg font-bold text-white hover:text-gray-300 transition-colors"
            >
              ระบบสัญญาเช่าพื้นที่
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center">
            {user ? (
              <Button
                asChild
                size="sm"
                className="flex items-center gap-2 bg-white text-[#212121] hover:bg-gray-200"
              >
                <Link href="/user/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>ไปแดชบอร์ด</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="flex items-center gap-2 bg-white text-[#212121] hover:bg-gray-200"
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
