/**
 * Brocha — User Migration Script
 * ================================
 * Pulls all users from LeadGods /es/api/client and creates them in Supabase Auth.
 *
 * Usage:
 *   npx tsx scripts/migrate-users.ts
 *
 * Required env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← get from Supabase → Settings → API
 *   LEADGODS_API_URL            ← e.g. http://dev.dashboard.api.leadgods.co
 *   LEADGODS_API_TOKEN          ← active session token
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ────────────────────────────────────────────────────────────

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const LEADGODS_API_URL    = process.env.LEADGODS_API_URL ?? 'http://dev.dashboard.api.leadgods.co'
const LEADGODS_API_TOKEN  = process.env.LEADGODS_API_TOKEN!
const BATCH_SIZE          = 100   // users per page
const DELAY_MS            = 300   // ms between Supabase invites (rate limit)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !LEADGODS_API_TOKEN) {
  console.error('❌ Missing env vars. Check .env.local')
  process.exit(1)
}

// Admin client — bypasses RLS, can create users
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── LeadGods /es/api/client types ────────────────────────────────────

interface LeadGodsClient {
  userId: string
  partnerusId: string
  displayName: string
  name: string
  lastName: string | null
  rolId: string
  rol: string
  email: string
  state: string
  nameState: string
  country: string | null
  code: string | null
  phone: string | null
  city: string | null
}

interface LeadGodsResponse {
  success: boolean
  total: number
  page: number
  data: LeadGodsClient[]
}

// ── Fetch all users with pagination ──────────────────────────────────

async function fetchAllUsers(): Promise<LeadGodsClient[]> {
  const allUsers: LeadGodsClient[] = []
  let page = 1
  let total = Infinity

  console.log(`\n📥 Fetching clients from LeadGods...`)
  console.log(`   URL: ${LEADGODS_API_URL}/es/api/client`)

  while (allUsers.length < total) {
    const url = `${LEADGODS_API_URL}/es/api/client?limit=${BATCH_SIZE}&page=${page}`

    const res = await fetch(url, {
      headers: { Authorization: LEADGODS_API_TOKEN },
      redirect: 'manual',   // don't follow redirects (expired token → Google)
    })

    // 3xx = token expired or invalid
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') ?? '(unknown)'
      throw new Error(
        `LeadGods redirected to: ${location}\n` +
        `   Token is expired. Get a fresh one from the browser Network tab.`
      )
    }

    if (!res.ok) {
      throw new Error(`LeadGods API error ${res.status}: ${await res.text()}`)
    }

    const json: LeadGodsResponse = await res.json()

    if (!json.success || !json.data) {
      throw new Error(`Unexpected response: ${JSON.stringify(json)}`)
    }

    if (page === 1) {
      total = json.total
      console.log(`   Total clients found: ${total}`)
    }

    allUsers.push(...json.data)
    console.log(`   Page ${page} → ${allUsers.length}/${total} fetched`)

    if (json.data.length < BATCH_SIZE) break
    page++
  }

  return allUsers
}

// ── Create user in Supabase Auth ──────────────────────────────────────

interface MigrationResult {
  email: string
  status: 'created' | 'exists' | 'skipped' | 'error'
  error?: string
}

// Cache of existing emails to avoid repeated listUsers calls
let existingEmails: Set<string> | null = null

async function loadExistingEmails() {
  console.log('\n🔍 Loading existing Supabase users...')
  existingEmails = new Set()
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Failed to list users: ${error.message}`)
    for (const u of data.users) {
      if (u.email) existingEmails.add(u.email.toLowerCase())
    }
    if (data.users.length < 1000) break
    page++
  }
  console.log(`   Found ${existingEmails.size} existing users in Supabase\n`)
}

async function createSupabaseUser(user: LeadGodsClient): Promise<MigrationResult> {
  const fullName = [user.name, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  const email = user.email?.trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return { email: email ?? '(empty)', status: 'skipped', error: 'Invalid email' }
  }

  // Skip inactive users
  if (user.state !== '1') {
    return { email, status: 'skipped', error: `Inactive (state=${user.state})` }
  }

  // Check against cached set
  if (existingEmails?.has(email)) {
    return { email, status: 'exists' }
  }

  // Create user — no password, OTP login only
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      leadgods_partner_id: user.partnerusId,
      leadgods_user_id: user.userId,
      role: user.rolId,
      country: user.country ?? '',
      city: user.city ?? '',
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('duplicate')) {
      existingEmails?.add(email)
      return { email, status: 'exists' }
    }
    return { email, status: 'error', error: error.message }
  }

  existingEmails?.add(email)

  // Pre-create artists row linked to auth user
  if (data.user) {
    await supabase.from('artists').upsert({
      id: data.user.id,
      name: fullName || email.split('@')[0],
      country: user.code ?? '',
      bio: '',
      instagram: '',
      website: '',
      sections: [],
      onboarding_complete: false,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  return { email, status: 'created' }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Brocha User Migration')
  console.log('========================')
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   LeadGods: ${LEADGODS_API_URL}`)

  // 1. Load existing Supabase users into memory
  await loadExistingEmails()

  // 2. Fetch all clients from LeadGods
  const users = await fetchAllUsers()
  console.log(`\n✅ Fetched ${users.length} clients total\n`)

  // 3. Migrate to Supabase
  const results: MigrationResult[] = []
  let created = 0, existed = 0, skipped = 0, errors = 0

  console.log('👥 Creating users in Supabase Auth...\n')

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const result = await createSupabaseUser(user)
    results.push(result)

    const icon = result.status === 'created'  ? '✅' :
                 result.status === 'exists'   ? '⚠️ ' :
                 result.status === 'skipped'  ? '⏭️ ' : '❌'
    const msg  = result.error ? ` — ${result.error}` : ''
    console.log(`   [${i + 1}/${users.length}] ${icon} ${result.email}${msg}`)

    if      (result.status === 'created')  created++
    else if (result.status === 'exists')   existed++
    else if (result.status === 'skipped')  skipped++
    else                                   errors++

    // Rate limit — avoid hammering Supabase
    if (result.status === 'created' && i < users.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  // 4. Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Migration Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   ✅ Created:  ${created}`)
  console.log(`   ⚠️  Existed:  ${existed}`)
  console.log(`   ⏭️  Skipped:  ${skipped}`)
  console.log(`   ❌ Errors:   ${errors}`)
  console.log(`   📦 Total:    ${users.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (errors > 0) {
    console.log('\n❌ Failed emails:')
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => console.log(`   • ${r.email}: ${r.error}`))
  }

  console.log('\n🎉 Migration complete!')
  console.log('   Users can now log in at /login with their email + OTP.')
}

main().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
