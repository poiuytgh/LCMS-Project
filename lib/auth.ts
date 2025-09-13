import { supabase } from "./supabase"
import { cookies } from "next/headers"

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return null
  return user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Admin authentication using environment variables
export async function verifyAdminCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  return email === adminEmail && password === adminPassword
}

export async function setAdminSession() {
  const cookieStore = cookies()
  cookieStore.set("admin_session", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })
}

export async function getAdminSession() {
  const cookieStore = cookies()
  return cookieStore.get("admin_session")?.value === "true"
}

export async function clearAdminSession() {
  const cookieStore = cookies()
  cookieStore.delete("admin_session")
}
