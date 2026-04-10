'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PortalState } from '@/lib/types'
import { initialState, makeProduct, makeModule } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import {
  uploadFile,
  uploadPrivateFile,
  generatePath,
  submitPortal,
  makeEmptyResolvedUrls,
} from '@/lib/supabase'
import Stepper from '@/components/portal/Stepper'
import Step2Section from '@/components/portal/Step2Section'
import Step3Tienda from '@/components/portal/Step3Tienda'
import Step3Estudios from '@/components/portal/Step3Estudios'
import Step4Review from '@/components/portal/Step4Review'

export default function PortalPage() {
  const [state, setState] = useState<PortalState>({ ...initialState, step: 2 })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load authenticated user + existing artist data from Supabase
  useEffect(() => {
    const supabase = createClient()

    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserEmail(user.email ?? '')

      // Fallback name from metadata / email prefix
      const metaName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
      const emailPrefix = (user.email ?? '').split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      const fallbackName = metaName || emailPrefix

      // Try to load existing artist row
      const { data: artist } = await supabase
        .from('artists')
        .select('*')
        .eq('id', user.id)
        .single()

      // Always start at step 2 (Step 1 / profile is removed)
      const savedSections = Array.isArray(artist?.sections) ? artist.sections as string[] : []
      setState((prev) => ({
        ...prev,
        step: 2,
        artistName:      artist?.name              || fallbackName || prev.artistName,
        country:         artist?.country           || prev.country,
        bio:             artist?.bio               || prev.bio,
        instagram:       artist?.instagram         || prev.instagram,
        website:         artist?.website           || prev.website,
        profilePhotoUrl: artist?.profile_photo_url || prev.profilePhotoUrl,
        sections: {
          tienda:   savedSections.includes('tienda'),
          estudios: savedSections.includes('estudios'),
        },
      }))

      setLoading(false)
    }

    loadUserData()
  }, [router])

  const update = useCallback((patch: Partial<PortalState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  function scrollTop() {
    // Scroll both window and body to cover all browser/env differences
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (_) {}
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  function goTo(step: PortalState['step']) {
    update({ step })
    scrollTop()
  }

  // When "Continuar" from step 2:
  // - If tienda selected, go to tienda content screen
  // - If only estudios, go to estudios content screen
  function goToContent(screen?: 'tienda' | 'estudios') {
    const { sections } = state
    if (!sections.tienda && !sections.estudios) return

    if (screen) {
      update({ step: 3, contentScreen: screen })
    } else if (sections.tienda) {
      // Ensure at least one product
      const products = state.products.length === 0 ? [makeProduct()] : state.products
      update({ step: 3, contentScreen: 'tienda', products })
    } else {
      // Only estudios
      const studio = state.studio.modules.length === 0
        ? { ...state.studio, modules: [makeModule()] }
        : state.studio
      update({ step: 3, contentScreen: 'estudios', studio })
    }
    scrollTop()
  }

  // When "Continuar" from tienda content:
  // If estudios also selected → go to estudios; else → review
  function goFromTienda() {
    if (state.sections.estudios) {
      const studio = state.studio.modules.length === 0
        ? { ...state.studio, modules: [makeModule()] }
        : state.studio
      update({ step: 3, contentScreen: 'estudios', studio })
      scrollTop()
    } else {
      goTo(4)
    }
  }

  // When "Volver" from estudios content:
  // If tienda also selected → go back to tienda; else → step 2
  function goBackFromEstudios() {
    if (state.sections.tienda) {
      update({ step: 3, contentScreen: 'tienda' })
      scrollTop()
    } else {
      goTo(2)
    }
  }

  // Avatar initials from artist name
  const initials = state.artistName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const resolved = makeEmptyResolvedUrls()

      // ── 1. Profile photo ──────────────────────────────────────
      if (state.profilePhotoFile) {
        resolved.profilePhotoUrl = await uploadFile(
          'profile-photos',
          generatePath('photos', state.profilePhotoFile),
          state.profilePhotoFile
        )
      }

      // ── 2. Product images ─────────────────────────────────────
      if (state.sections.tienda) {
        resolved.productImageUrls = await Promise.all(
          state.products.map(async (p) => {
            const urls = await Promise.all(
              p.imageFiles.map((f) =>
                uploadFile('product-images', generatePath(`products/${p.id}`, f), f)
              )
            )
            return urls.filter((u): u is string => u !== null)
          })
        )
      }

      // ── 3. Studio cover + promo video ─────────────────────────
      if (state.sections.estudios) {
        if (state.studio.coverFiles[0]) {
          resolved.studioCoverUrl = await uploadFile(
            'studio-covers',
            generatePath('covers', state.studio.coverFiles[0]),
            state.studio.coverFiles[0]
          )
        }
        if (state.studio.introVideoFile) {
          resolved.studioVideoUrl = await uploadFile(
            'studio-videos',
            generatePath('promos', state.studio.introVideoFile),
            state.studio.introVideoFile
          )
        }

        // ── 4. Session videos ─────────────────────────────────
        for (const m of state.studio.modules) {
          for (const sess of m.sessions) {
            if (sess.videoFile) {
              resolved.sessionVideoUrls[sess.id] = await uploadPrivateFile(
                'session-videos',
                generatePath(`sessions/${m.id}`, sess.videoFile),
                sess.videoFile
              )
            }
          }
        }

        // ── 5. Resource files ─────────────────────────────────
        for (const r of state.studio.resources) {
          if (r.file) {
            resolved.resourceUrls[r.id] = await uploadPrivateFile(
              'resources',
              generatePath('resources', r.file),
              r.file
            )
          }
        }
      }

      // ── 6. Submit to DB ───────────────────────────────────────
      const result = await submitPortal(state, resolved)

      if (!result.success) {
        setSubmitError(result.error ?? 'Error desconocido. Intenta de nuevo.')
        setSubmitting(false)
        return
      }

      goTo(5)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de red. Verifica tu conexión.'
      setSubmitError(msg)
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  const currentStep = state.step <= 4 ? state.step : 4

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(115,68,224,0.25)',
          borderTop: '3px solid #7344E0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      {/* Sticky Nav */}
      <nav className="portal-nav">
        <div className="logo">
          <img src="/brocha-logo.svg" alt="Brocha" style={{ height: 36, width: 'auto' }} />
        </div>
        <div className="nav-artist">
          <div className="nav-avatar">
            {state.profilePhotoUrl
              ? <img src={state.profilePhotoUrl} alt="avatar" />
              : initials || '?'
            }
          </div>
          <span className="nav-name">{state.artistName || userEmail || 'Artista'}</span>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 12, marginLeft: 4 }}
            onClick={() => router.push('/dashboard')}
          >
            ← Inicio
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 12, marginLeft: 4 }}
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/login')
            }}
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Progress bar (hidden on success screen) */}
      {state.step < 5 && <Stepper current={currentStep} />}

      {/* Main content */}
      <main className="portal-main">

        {/* ── SCREEN 5: SUCCESS ── */}
        {state.step === 5 && (
          <div className="success-screen screen-anim">
            <div className="success-icon">
              <svg viewBox="0 0 24 24">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <div className="success-title">¡Material enviado!</div>
            <div className="success-sub">
              Tu material está en revisión. El equipo Brocha te notificará en máximo 72 horas cuando esté publicado.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-ghost"
                onClick={() => router.push('/vitrina')}
              >
                Ver mi vitrina
              </button>
              <button
                className="btn btn-yellow"
                onClick={() => router.push('/dashboard')}
              >
                Ir al inicio →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: SECCIÓN ── */}
        {state.step === 2 && (
          <Step2Section
            state={state}
            update={update}
            onNext={() => goToContent()}
            onBack={() => router.push('/dashboard')}
          />
        )}

        {/* ── STEP 3: TIENDA ── */}
        {state.step === 3 && state.contentScreen === 'tienda' && (
          <Step3Tienda
            state={state}
            update={update}
            onNext={goFromTienda}
            onBack={() => goTo(2)}
          />
        )}

        {/* ── STEP 3: ESTUDIOS ── */}
        {state.step === 3 && state.contentScreen === 'estudios' && (
          <Step3Estudios
            state={state}
            update={update}
            onNext={() => goTo(4)}
            onBack={goBackFromEstudios}
          />
        )}

        {/* ── STEP 4: REVISIÓN ── */}
        {state.step === 4 && (
          <>
            {submitError && (
              <div style={{
                background: 'rgba(255,80,80,0.1)',
                border: '1px solid rgba(255,80,80,0.3)',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 20,
                fontSize: 13,
                color: '#ff9090',
              }}>
                ❌ {submitError}
              </div>
            )}
            <Step4Review
              state={state}
              onBack={() => {
                if (state.sections.estudios) {
                  update({ step: 3, contentScreen: 'estudios' })
                } else if (state.sections.tienda) {
                  update({ step: 3, contentScreen: 'tienda' })
                }
                scrollTop()
              }}
              onEdit={(step, screen) => {
                if (step === 3 && screen) {
                  update({ step: 3, contentScreen: screen })
                  scrollTop()
                } else {
                  goTo(step)
                }
              }}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </>
        )}
      </main>
    </>
  )
}
