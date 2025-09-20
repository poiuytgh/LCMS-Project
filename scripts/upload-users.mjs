#!/usr/bin/env node
// Upload users to Supabase Auth and ensure profiles exist
// Usage:
//   PowerShell:
//     $env:NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"; \
//     $env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"; \
//     node scripts/upload-users.mjs scripts/users.json
//   Bash:
//     NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-users.mjs scripts/users.json

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[upload-users] Missing env. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function resolveInputPath(argPath) {
  if (!argPath) return path.join(process.cwd(), 'scripts', 'users.json')
  return path.isAbsolute(argPath) ? argPath : path.join(process.cwd(), argPath)
}

function loadUsersFromJson(filePath) {
  const exists = fs.existsSync(filePath)
  if (!exists) {
    console.error(`[upload-users] Input file not found: ${filePath}`)
    console.error('[upload-users] Create scripts/users.json (see scripts/users.sample.json for format)')
    process.exit(1)
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) throw new Error('users.json must be an array of users')
    return data
  } catch (e) {
    console.error('[upload-users] Failed to parse JSON:', e.message)
    process.exit(1)
  }
}

async function findUserIdByEmail(email) {
  // Try to locate a user by paging through admin listUsers
  let page = 1
  const perPage = 1000
  // Some Supabase versions support filtering by email; try that first
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000, email })
    if (!error && data && Array.isArray(data.users)) {
      const found = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
      if (found) return found.id
    }
  } catch (_) {
    // Fall back to manual paging below
  }
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (found) return found.id
    if (data.users.length < perPage) break
    page += 1
  }
  return null
}

async function upsertProfile(userId, profile) {
  const payload = {
    id: userId,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone ?? null,
    avatar_url: profile.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

async function createOrUpdateUser(entry) {
  const { email, password, first_name, last_name, phone, avatar_url } = entry
  if (!email) throw new Error('email is required')
  if (!first_name || !last_name) throw new Error('first_name and last_name are required')

  // Try to create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: password || Math.random().toString(36).slice(2) + 'Aa#1',
    email_confirm: true,
    user_metadata: { first_name, last_name, phone, avatar_url },
  })

  if (!error && data?.user?.id) {
    const userId = data.user.id
    await upsertProfile(userId, entry)
    return { status: 'created', userId }
  }

  // If user already exists, upsert profile instead
  const alreadyExists = error && String(error.message || '').toLowerCase().includes('already')
  if (alreadyExists) {
    const userId = await findUserIdByEmail(email)
    if (!userId) return { status: 'skipped', reason: 'exists_not_found' }
    await upsertProfile(userId, entry)
    return { status: 'updated', userId }
  }

  throw error
}

async function main() {
  const inputPath = resolveInputPath(process.argv[2])
  const users = loadUsersFromJson(inputPath)
  console.log(`[upload-users] Loaded ${users.length} users from ${inputPath}`)

  let created = 0,
    updated = 0,
    skipped = 0,
    failed = 0

  for (const [i, user] of users.entries()) {
    const label = `${i + 1}/${users.length} ${user.email}`
    try {
      const res = await createOrUpdateUser(user)
      if (res.status === 'created') {
        created += 1
        console.log(`✔ ${label} -> created (${res.userId})`)
      } else if (res.status === 'updated') {
        updated += 1
        console.log(`✔ ${label} -> updated profile (${res.userId})`)
      } else {
        skipped += 1
        console.log(`• ${label} -> skipped (${res.reason || 'unknown'})`)
      }
    } catch (e) {
      failed += 1
      console.error(`✖ ${label} -> error:`, e?.message || e)
    }
  }

  console.log('[upload-users] Done:', { created, updated, skipped, failed })
}

main().catch((e) => {
  console.error('[upload-users] Fatal error:', e?.message || e)
  process.exit(1)
})

