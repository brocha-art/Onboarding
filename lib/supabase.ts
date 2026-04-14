import { createClient as createBrowserClientHelper } from '@/lib/supabase-client'
import type { PortalState, Product, Studio } from './types'

// Re-export for components that still import from here
export { createBrowserClientHelper as createClient }

// ----------------------------------------------------------------
// Storage helpers — use browser client (called from Client Components)
// ----------------------------------------------------------------

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const supabase = createBrowserClientHelper()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) {
    console.error(`Upload error [${bucket}/${path}]:`, error.message)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function uploadPrivateFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const supabase = createBrowserClientHelper()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) {
    console.error(`Upload error [${bucket}/${path}]:`, error.message)
    return null
  }

  return data.path
}

export function generatePath(prefix: string, file: File): string {
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
}

// ----------------------------------------------------------------
// Resolved URLs — built during handleSubmit() after uploading all files
// ----------------------------------------------------------------

export interface ResolvedUrls {
  profilePhotoUrl: string | null
  productImageUrls: string[][]
  studioCoverUrl: string | null
  studioVideoUrl: string | null
  sessionVideoUrls: Record<string, string | null>
  resourceUrls: Record<string, string | null>
}

export function makeEmptyResolvedUrls(): ResolvedUrls {
  return {
    profilePhotoUrl: null,
    productImageUrls: [],
    studioCoverUrl: null,
    studioVideoUrl: null,
    sessionVideoUrls: {},
    resourceUrls: {},
  }
}

// ----------------------------------------------------------------
// submitPortal — inserts everything in order, scoped to auth user
// ----------------------------------------------------------------

export async function submitPortal(
  state: PortalState,
  resolved: ResolvedUrls
): Promise<{ success: boolean; error?: string; artistId?: string }> {
  const supabase = createBrowserClientHelper()

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'No hay sesión activa. Por favor inicia sesión.' }
  }
  const artistId = user.id

  const sections: string[] = []
  if (state.sections.tienda) sections.push('tienda')
  if (state.sections.estudios) sections.push('estudios')

  // 1. Upsert artist row (id = auth user id)
  const { error: artistError } = await supabase
    .from('artists')
    .upsert({
      id: artistId,
      name: state.artistName,
      country: state.country,
      bio: state.bio,
      profile_photo_url: resolved.profilePhotoUrl ?? null,
      instagram: state.instagram,
      website: state.website,
      sections,
      onboarding_complete: true,
    })

  if (artistError) {
    console.error('Artist upsert error:', artistError)
    return { success: false, error: artistError.message }
  }

  // 2. Upsert submission record — get or create, always get the id
  let submissionId: string | null = null
  const { data: existingSub } = await supabase
    .from('submissions')
    .select('id')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSub) {
    submissionId = existingSub.id
    // Reset to pending on resubmit
    await supabase
      .from('submissions')
      .update({ status: 'pending', rejection_reason: null, reviewed_at: null })
      .eq('id', submissionId)
  } else {
    const { data: newSub } = await supabase
      .from('submissions')
      .insert({ artist_id: artistId, status: 'pending' })
      .select('id')
      .single()
    submissionId = newSub?.id ?? null
  }

  // 3. Upsert products — delete old ones first, then re-insert
  if (state.sections.tienda && state.products.length > 0) {
    await supabase.from('products').delete().eq('artist_id', artistId)

    const productRows = state.products.map((p: Product, i: number) => ({
      artist_id: artistId,
      submission_id: submissionId,
      name: p.title,
      description: p.description,
      type: p.type,
      technique: p.technique,
      year: p.year,
      dimensions: p.dimensions,
      price: parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0,
      stock: p.stock ? parseInt(p.stock) : null,
      shipping_option: p.shippingOption ?? '',
      shipping_countries: p.shippingCountries,
      shipping_policy: p.shippingPolicy,
      image_urls: resolved.productImageUrls[i] ?? [],
    }))

    const { error: prodError } = await supabase.from('products').insert(productRows)
    if (prodError) console.error('Products insert error:', prodError)
  }

  // 4. Upsert studio — delete old one first, then re-insert
  if (state.sections.estudios) {
    const s: Studio = state.studio

    await supabase.from('studios').delete().eq('artist_id', artistId)

    const { data: studioRow, error: studioError } = await supabase
      .from('studios')
      .insert({
        artist_id: artistId,
        submission_id: submissionId,
        name: s.title,
        description: s.description,
        level: s.level,
        price: parseFloat(s.price.replace(/[^0-9.]/g, '')) || 0,
        cover_url: resolved.studioCoverUrl ?? null,
        promo_video_url: resolved.studioVideoUrl ?? null,
      })
      .select()
      .single()

    if (studioError) {
      console.error('Studio insert error:', studioError)
      return { success: true, artistId }
    }
    const studioId: string = studioRow.id

    // Modules
    for (let mi = 0; mi < s.modules.length; mi++) {
      const m = s.modules[mi]

      const { data: moduleRow, error: moduleError } = await supabase
        .from('modules')
        .insert({
          studio_id: studioId,
          title: m.title,
          description: m.description,
          order: mi,
        })
        .select()
        .single()

      if (moduleError) { console.error('Module insert error:', moduleError); continue }
      const moduleId: string = moduleRow.id

      const sessionRows = m.sessions.map((sess, si) => ({
        module_id: moduleId,
        title: sess.title,
        description: sess.description,
        video_url: resolved.sessionVideoUrls[sess.id] ?? null,
        hls_status: resolved.sessionVideoUrls[sess.id] ? 'pending' : null,
        order: si,
      }))
      if (sessionRows.length > 0) {
        const { error: sessError } = await supabase.from('sessions').insert(sessionRows)
        if (sessError) console.error('Sessions insert error:', sessError)
      }
    }

    // Resources
    const resourceRows = s.resources.map((r) => ({
      studio_id: studioId,
      name: r.name,
      type: r.type || 'Otro',
      url: r.url,
      file_url: resolved.resourceUrls[r.id] ?? null,
    }))
    if (resourceRows.length > 0) {
      const { error: resError } = await supabase.from('resources').insert(resourceRows)
      if (resError) console.error('Resources insert error:', resError)
    }
  }

  return { success: true, artistId }
}
