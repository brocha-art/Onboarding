'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

type Status = 'pending' | 'approved' | 'published' | 'rejected'

interface ProductDetail {
  id: string
  name: string
  description: string
  price: number
  technique: string
  year: string
  dimensions: string
  image_urls: string[]
  shipping_option: string
  type: string
}

interface SessionDetail {
  id: string
  title: string
  order: number
}

interface ModuleDetail {
  id: string
  title: string
  order: number
  sessions: SessionDetail[]
}

interface StudioDetail {
  id: string
  name: string
  description: string
  level: string
  price: number
  cover_url: string | null
  modules: ModuleDetail[]
}

interface AdminItem {
  submissionId: string
  artistId: string
  artistName: string
  artistEmail: string
  status: Status
  createdAt: string
  rejectionReason: string
  contentType: 'product' | 'studio' | 'mixed'
  productCount: number
  hasStudio: boolean
  products: ProductDetail[]
  studio: StudioDetail | null
  // ui state
  showRejectInput: boolean
  showContent: boolean
  loading: boolean
}

const STATUS_LABEL: Record<Status, string> = {
  pending:   'En revisión',
  approved:  'Aprobado',
  published: 'Publicado',
  rejected:  'Rechazado',
}

const STATUS_CLASS: Record<Status, string> = {
  pending:   'status-pending',
  approved:  'status-approved',
  published: 'status-published',
  rejected:  'status-rejected',
}

export default function AdminPage() {
  const [items, setItems]         = useState<AdminItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [adminName, setAdminName] = useState('')
  const [filter, setFilter]       = useState<Status | 'all'>('all')
  const [lightbox, setLightbox]   = useState<string | null>(null)
  const router = useRouter()
  // Memoize so the client instance is stable across renders and safe as an effect dependency
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Verify admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setAdminName(user.email || 'Admin')

      // Load all submissions with artist info
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          id,
          artist_id,
          status,
          created_at,
          rejection_reason,
          artists (name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Admin load error:', error)
        setLoading(false)
        return
      }

      // For each submission load full content
      const rows: AdminItem[] = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (submissions ?? []).map(async (sub: any) => {
          // Parallel: artist name, products, studios
          const [artistResult, productsResult, studiosResult] = await Promise.all([
            supabase
              .from('artists')
              .select('name')
              .eq('id', sub.artist_id)
              .maybeSingle(),
            supabase
              .from('products')
              .select('id, name, description, price, technique, year, dimensions, image_urls, shipping_option, type')
              .eq('submission_id', sub.id),
            supabase
              .from('studios')
              .select(`
                id, name, description, level, price, cover_url,
                modules ( id, title, order, sessions ( id, title, order ) )
              `)
              .eq('submission_id', sub.id),
          ])

          if (productsResult.error) console.error('Products RLS error:', productsResult.error)
          if (studiosResult.error)  console.error('Studios RLS error:',  studiosResult.error)

          const artistsJoin = Array.isArray(sub.artists) ? sub.artists[0] : sub.artists
          const artistName = artistResult.data?.name || artistsJoin?.name || '(Sin nombre)'

          const products: ProductDetail[] = (productsResult.data ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => ({
              id: p.id,
              name: p.name ?? '',
              description: p.description ?? '',
              price: p.price ?? 0,
              technique: p.technique ?? '',
              year: p.year ?? '',
              dimensions: p.dimensions ?? '',
              image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
              shipping_option: p.shipping_option ?? '',
              type: p.type ?? '',
            })
          )

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawStudios: any[] = studiosResult.data ?? []
          let studio: StudioDetail | null = null
          if (rawStudios.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s: any = rawStudios[0]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawModules: any[] = Array.isArray(s.modules) ? s.modules : []
            const modules: ModuleDetail[] = rawModules
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((m: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawSessions: any[] = Array.isArray(m.sessions) ? m.sessions : []
                const sessions: SessionDetail[] = rawSessions
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((ses: any) => ({
                    id: ses.id,
                    title: ses.title ?? '',
                    order: ses.order ?? 0,
                  }))
                return {
                  id: m.id,
                  title: m.title ?? '',
                  order: m.order ?? 0,
                  sessions,
                }
              })
            studio = {
              id: s.id,
              name: s.name ?? '',
              description: s.description ?? '',
              level: s.level ?? '',
              price: s.price ?? 0,
              cover_url: s.cover_url ?? null,
              modules,
            }
          }

          return {
            submissionId: sub.id,
            artistId: sub.artist_id,
            artistName,
            artistEmail: '',
            status: sub.status as Status,
            createdAt: sub.created_at,
            rejectionReason: sub.rejection_reason || '',
            contentType:
              products.length > 0 && studio !== null
                ? 'mixed'
                : products.length > 0
                ? 'product'
                : 'studio',
            productCount: products.length,
            hasStudio: studio !== null,
            products,
            studio,
            showRejectInput: false,
            showContent: false,
            loading: false,
          } as AdminItem
        })
      )

      setItems(rows)
      setLoading(false)
    }
    load()
  }, [router, supabase])

  function updateItem(id: string, patch: Partial<AdminItem>) {
    setItems(prev => prev.map(it => it.submissionId === id ? { ...it, ...patch } : it))
  }

  async function handleApprove(item: AdminItem) {
    updateItem(item.submissionId, { loading: true })
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', item.submissionId)

    updateItem(item.submissionId, { loading: false, status: error ? item.status : 'approved' })

    if (!error) {
      fetch('/api/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: item.artistId, submissionId: item.submissionId }),
      })
    }
  }

  async function handleReject(item: AdminItem) {
    if (!item.rejectionReason.trim()) return
    updateItem(item.submissionId, { loading: true })

    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'rejected',
        rejection_reason: item.rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', item.submissionId)

    updateItem(item.submissionId, {
      loading: false,
      status: error ? item.status : 'rejected',
      showRejectInput: false,
    })

    if (!error) {
      fetch('/api/send-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: item.artistId, rejectionReason: item.rejectionReason }),
      })
    }
  }

  const filtered = filter === 'all' ? items : items.filter(it => it.status === filter)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(116,84,232,0.25)', borderTop: '3px solid #7454e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Page-level lightbox */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Close button */}
          <button
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
            style={{
              position: 'fixed',
              top: 20,
              right: 24,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 18,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Vista ampliada"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      )}

      <nav className="portal-nav">
        <div className="logo">
          <img src="/brocha-logo.svg" alt="Brocha" style={{ height: 36, width: 'auto' }} />
        </div>
        <div className="nav-artist" style={{ gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#7454e8', background: 'rgba(116,84,232,0.15)', padding: '4px 10px', borderRadius: 6 }}>Admin</span>
          <span className="nav-name">{adminName}</span>
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => router.push('/dashboard')}>
            ← Inicio
          </button>
        </div>
      </nav>

      <main className="portal-main">
        <div className="screen-anim">
          <h1 className="screen-title" style={{ marginBottom: 6 }}>Panel de <span>Aprobación</span></h1>
          <p className="screen-sub">Revisa y aprueba el contenido enviado por los artistas.</p>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {(['all', 'pending', 'approved', 'published', 'rejected'] as const).map(f => {
              const count = f === 'all' ? items.length : items.filter(it => it.status === f).length
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                    background: filter === f ? '#7454e8' : 'transparent',
                    borderColor: filter === f ? '#7454e8' : 'rgba(116,84,232,0.3)',
                    color: filter === f ? '#fff' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.2s',
                  }}
                >
                  {f === 'all' ? 'Todos' : STATUS_LABEL[f]} ({count})
                </button>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              No hay envíos en esta categoría.
            </div>
          )}

          {filtered.map(item => (
            <div key={item.submissionId} className="vitrina-card" style={{ marginBottom: 20 }}>
              {/* Card header */}
              <div className="vitrina-card-header">
                <div>
                  <div className="vitrina-card-title">{item.artistName}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="admin-artist-tag">
                      {item.productCount > 0 ? `${item.productCount} producto${item.productCount > 1 ? 's' : ''}` : ''}
                      {item.productCount > 0 && item.hasStudio ? ' + ' : ''}
                      {item.hasStudio ? 'Estudio' : ''}
                    </span>
                    <span className="vitrina-card-meta">
                      {new Date(item.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <span className={`status-badge ${STATUS_CLASS[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>

              {/* Toggle content button */}
              <div style={{ marginBottom: 12 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => updateItem(item.submissionId, { showContent: !item.showContent })}
                  style={{ fontSize: 12, color: 'var(--purple)', border: '1px solid rgba(116,84,232,0.3)', fontFamily: 'Montserrat, sans-serif', padding: '5px 14px', borderRadius: 8 }}
                >
                  {item.showContent ? 'Ocultar ▲' : 'Ver contenido ▼'}
                </button>
              </div>

              {/* Expandable content section */}
              {item.showContent && (
                <div style={{
                  background: 'rgba(116,84,232,0.04)',
                  borderTop: '1px solid rgba(116,84,232,0.12)',
                  borderRadius: '0 0 12px 12px',
                  padding: '16px 0 4px',
                  marginBottom: 12,
                }}>
                  {/* Products */}
                  {item.products.map((product, pIdx) => (
                    <div key={product.id} style={{ padding: '0 16px', marginBottom: 16 }}>
                      {/* Product label */}
                      <div style={{
                        fontSize: 10,
                        fontVariant: 'small-caps',
                        fontWeight: 700,
                        letterSpacing: 1.2,
                        color: 'var(--purple)',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                      }}>
                        Producto · {product.type}
                      </div>

                      {/* Image gallery */}
                      {product.image_urls.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                          {product.image_urls.slice(0, 4).map((url, iIdx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={iIdx}
                              src={url}
                              alt={`${product.name} imagen ${iIdx + 1}`}
                              onClick={() => setLightbox(url)}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '0.5px solid rgba(116,84,232,0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                            />
                          ))}
                        </div>
                      )}

                      {/* Fields grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '6px 16px',
                      }}>
                        <FieldPair label="Título" value={product.name} />
                        <FieldPair label="Tipo" value={product.type} />
                        <FieldPair label="Técnica" value={product.technique} />
                        <FieldPair label="Año" value={product.year} />
                        <FieldPair label="Dimensiones" value={product.dimensions} />
                        <FieldPair
                          label="Precio"
                          value={product.price ? `$${product.price.toLocaleString('es-CO')}` : '—'}
                          highlight
                        />
                        <FieldPair label="Envío" value={product.shipping_option} />
                      </div>

                      {/* Separator between products */}
                      {pIdx < item.products.length - 1 && (
                        <div style={{ borderBottom: '1px solid rgba(116,84,232,0.1)', marginTop: 14 }} />
                      )}
                    </div>
                  ))}

                  {/* Studio */}
                  {item.studio && (
                    <div style={{ padding: '0 16px', marginTop: item.products.length > 0 ? 12 : 0 }}>
                      {item.products.length > 0 && (
                        <div style={{ borderBottom: '1px solid rgba(116,84,232,0.1)', marginBottom: 14 }} />
                      )}

                      <div style={{
                        fontSize: 10,
                        fontVariant: 'small-caps',
                        fontWeight: 700,
                        letterSpacing: 1.2,
                        color: 'var(--purple)',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                      }}>
                        Estudio
                      </div>

                      {/* Cover image */}
                      {item.studio.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.studio.cover_url}
                          alt={item.studio.name}
                          style={{
                            width: '100%',
                            maxHeight: 160,
                            objectFit: 'cover',
                            borderRadius: 10,
                            marginBottom: 12,
                            display: 'block',
                          }}
                        />
                      )}

                      {/* Studio fields */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '6px 16px',
                        marginBottom: 12,
                      }}>
                        <FieldPair label="Nombre" value={item.studio.name} />
                        <FieldPair label="Nivel" value={item.studio.level} />
                        <FieldPair
                          label="Precio"
                          value={item.studio.price ? `$${item.studio.price.toLocaleString('es-CO')}` : '—'}
                          highlight
                        />
                        <FieldPair label="Descripción" value={item.studio.description} fullWidth />
                      </div>

                      {/* Modules + sessions */}
                      {item.studio.modules.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8, letterSpacing: 0.5 }}>
                            Módulos y sesiones
                          </div>
                          {item.studio.modules.map(mod => (
                            <div key={mod.id} style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>
                                {mod.order}. {mod.title}
                              </div>
                              {mod.sessions.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 20, listStyle: 'none' }}>
                                  {mod.sessions.map(ses => (
                                    <li key={ses.id} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid rgba(116,84,232,0.3)' }}>
                                      {ses.order}. {ses.title}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection reason display (if already rejected) */}
              {item.status === 'rejected' && item.rejectionReason && (
                <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#ff9090' }}>
                  Motivo: {item.rejectionReason}
                </div>
              )}

              {/* Reject textarea */}
              {item.showRejectInput && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="field-label" style={{ fontSize: 10 }}>Motivo del rechazo (se enviará al artista)</label>
                  <textarea
                    className="field-input"
                    style={{ minHeight: 72, resize: 'vertical' }}
                    placeholder="Ej: Las imágenes no cumplen con los requisitos de resolución mínima…"
                    value={item.rejectionReason}
                    onChange={e => updateItem(item.submissionId, { rejectionReason: e.target.value })}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="vitrina-card-actions">
                {item.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-sm"
                      disabled={item.loading}
                      style={{ background: 'rgba(80,200,120,0.15)', border: '1px solid rgba(80,200,120,0.4)', color: '#50c878', fontFamily: 'Montserrat, sans-serif' }}
                      onClick={() => handleApprove(item)}
                    >
                      {item.loading ? 'Guardando…' : '✓ Aprobar'}
                    </button>
                    {!item.showRejectInput ? (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b', fontFamily: 'Montserrat, sans-serif' }}
                        onClick={() => updateItem(item.submissionId, { showRejectInput: true })}
                      >
                        ✕ Rechazar
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateItem(item.submissionId, { showRejectInput: false, rejectionReason: '' })}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-sm"
                          disabled={item.loading || !item.rejectionReason.trim()}
                          style={{
                            background: 'rgba(255,80,80,0.1)',
                            border: '1px solid rgba(255,80,80,0.3)',
                            color: '#ff6b6b',
                            fontFamily: 'Montserrat, sans-serif',
                            opacity: !item.rejectionReason.trim() ? 0.4 : 1,
                          }}
                          onClick={() => handleReject(item)}
                        >
                          {item.loading ? 'Enviando…' : 'Confirmar rechazo'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {item.status === 'approved' && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                    Aprobado · esperando publicación del artista.
                  </span>
                )}

                {item.status === 'published' && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                    Publicado exitosamente.
                  </span>
                )}

                {item.status === 'rejected' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={item.loading}
                    onClick={() => handleApprove(item)}
                  >
                    Reactivar → Aprobar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// ── Helper sub-component ─────────────────────────────────────────────────────

function FieldPair({
  label,
  value,
  highlight = false,
  fullWidth = false,
}: {
  label: string
  value: string | number | null | undefined
  highlight?: boolean
  fullWidth?: boolean
}) {
  const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '—'
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: highlight ? 'var(--yellow)' : 'rgba(255,255,255,0.8)', fontWeight: highlight ? 700 : 400, lineHeight: 1.4 }}>
        {displayValue}
      </div>
    </div>
  )
}
