import Link from "next/link"

export function FooterHome() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span>© 2025 LCMS - ระบบสัญญาเช่าพื้นที่</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/about" className="hover:text-white transition-colors">
              เกี่ยวกับเรา
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
