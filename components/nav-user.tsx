"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { useNotifications } from "@/components/notification-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/* ===== ตั้งค่าถังรูปให้ตรงกับหน้าโปรไฟล์ ===== */
const AVATAR_BUCKET = "avatars";
/** ถ้าใช้ private bucket ให้ตั้งเป็น false แล้วจะสร้าง signed URL ให้อัตโนมัติ */
const BUCKET_PUBLIC = true;

/** ต้องตรงกับหน้าโปรไฟล์ */
const PROFILE_AVATAR_UPDATED_EVENT = "profile:avatar-updated";
const PROFILE_INFO_UPDATED_EVENT = "profile:info-updated";

type ProfileRow = {
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
};

export function NavUser() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [rawAvatar, setRawAvatar] = useState<string | null>(null); // public URL หรือ object path
  const [signedUrl, setSignedUrl] = useState<string | null>(null); // สำหรับ private bucket

  const makeInitials = useCallback(
    (first?: string | null, last?: string | null) => {
      const a = (first?.trim()?.[0] ?? "").toUpperCase();
      const b = (last?.trim()?.[0] ?? "").toUpperCase();
      const both = `${a}${b}`.trim();
      if (both) return both;
      const emailFirst = (user?.email?.[0] ?? "U").toUpperCase();
      return emailFirst;
    },
    [user?.email]
  );

  const initials = useMemo(
    () => makeInitials(firstName, lastName),
    [firstName, lastName, makeInitials]
  );

  /** โหลด avatar/ชื่อ ครั้งแรก */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      const row = (data as ProfileRow) ?? null;
      if (row) {
        setRawAvatar(row.avatar_url ?? null);
        setFirstName(row.first_name ?? null);
        setLastName(row.last_name ?? null);
      } else {
        const fn = (user as any)?.user_metadata?.first_name ?? null;
        const ln = (user as any)?.user_metadata?.last_name ?? null;
        setFirstName(fn);
        setLastName(ln);
        setRawAvatar(null);
      }
    })();
  }, [user?.id, supabase]);

  /** Realtime จากตาราง profiles */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("profiles-navuser")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as ProfileRow;
          setRawAvatar(row.avatar_url ?? null);
          setFirstName(row.first_name ?? null);
          setLastName(row.last_name ?? null);
        }
      )
      .subscribe();

    // ❗ cleanup ต้องไม่คืน Promise
    return () => {
      void supabase.removeChannel(channel); // fire-and-forget
    };
  }, [user?.id, supabase]);

  /** ฟัง event ภายในแท็บ (อัปโหลดรูป/แก้ชื่อจากหน้าโปรไฟล์) */
  useEffect(() => {
    const onAvatar = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail ?? null;
      setRawAvatar(detail);
    };
    const onInfo = (e: Event) => {
      const detail = (e as CustomEvent<{ first_name?: string | null; last_name?: string | null }>)
        .detail || {};
      if ("first_name" in detail) setFirstName(detail.first_name ?? null);
      if ("last_name" in detail) setLastName(detail.last_name ?? null);
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatar as EventListener);
    window.addEventListener(PROFILE_INFO_UPDATED_EVENT, onInfo as EventListener);

    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatar as EventListener);
      window.removeEventListener(PROFILE_INFO_UPDATED_EVENT, onInfo as EventListener);
    };
  }, []);

  /** ถ้าเป็น private bucket -> ขอ signed URL ทุกครั้งที่ path เปลี่ยน */
  useEffect(() => {
    if (BUCKET_PUBLIC) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      if (!rawAvatar) {
        setSignedUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(rawAvatar, 60 * 60); // 1 ชม.
      if (error) {
        console.error(error);
        setSignedUrl(null);
      } else {
        setSignedUrl(data.signedUrl);
      }
    })();
  }, [rawAvatar, supabase]);

  const avatarSrc = useMemo(() => {
    if (!rawAvatar) return "";
    return BUCKET_PUBLIC ? rawAvatar : signedUrl ?? "";
  }, [rawAvatar, signedUrl]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("ออกจากระบบสำเร็จ");
      router.push("/");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) await markAsRead(unreadIds);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const navItems = [
    { href: "/user/dashboard", label: "แดชบอร์ด" },
    { href: "/user/dashboard/contracts", label: "สัญญาของฉัน" },
    { href: "/user/dashboard/bills", label: "บิลค่าเช่า" },
    { href: "/user/dashboard/support", label: "แจ้งปัญหา" },
    { href: "/user/dashboard/profile", label: "โปรไฟล์" },
  ];

  return (
    <nav className="bg-secondary text-secondary-foreground border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Homepage */}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-1 text-sm font-medium transition-colors",
                pathname === "/" ? "text-white font-semibold" : "text-gray-300 hover:text-white"
              )}
            >
              <Home className="h-4 w-4" />
              Homepage
            </Link>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative text-gray-300 hover:text-white transition" aria-label="การแจ้งเตือน">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                      อ่านทั้งหมด
                    </Button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="p-4 cursor-pointer hover:bg-muted/70 data-[highlighted]:bg-muted"
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">ไม่มีการแจ้งเตือน</div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Avatar / Initials */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="เปิดเมนูโปรไฟล์">
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    {/* ใช้ key เพื่อรีเฟรชรูปทันทีเมื่อ URL เปลี่ยน */}
                    <AvatarImage key={avatarSrc} src={avatarSrc} className="object-cover" />
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
                  <Link href="/user/dashboard/profile">โปรไฟล์ของฉัน</Link>
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
