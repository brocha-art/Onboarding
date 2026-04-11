'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

type Status = 'pending' | 'approved' | 'published' | 'rejected'

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
  // ui state
  showRejectInput: boolean
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
  const router = useRouter()
  const supabase = createClient()

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
          artists (name),
          auth_users:artist_id (email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Admin load error:', error)
        setLoading(false)
        return
      }

      // For each submission load product/studio counts
      const rows: AdminItem[] = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (submissions ?? []).map(async (sub: any) => {
          const [{ count: prodCount }, { count: studioCount }] = await Promise.all([
            supabase.from('products').select('id', { count: 'exact', head: true }).eq('artist_id', sub.artist_id),
            supabase.from('studios').select('id', { count: 'exact', head: true }).eq('artist_id', sub.artist_id),
          ])

          // Get artist name from artists table
          const { data: authUser } = await supabase
            .from('artists')
            .select('name')
            .eq('id', sub.artist_id)
            .maybeSingle()

          const artistsJoin = Array.isArray(sub.artists) ? sub.artists[0] : sub.artists

          return {
            submissionId: sub.id,
            artistId: sub.artist_id,
            artistName: authUser?.name || artistsJoin?.name || '(Sin nombre)',
            artistEmail: '',    // loaded below
            status: sub.status as Status,
            createdAt: sub.created_at,
            rejectionReason: sub.rejection_reason || '',
            contentType: (prodCount ?? 0) > 0 && (studioCount ?? 0) > 0
              ? 'mixed'
              : (prodCount ?? 0) > 0 ? 'product' : 'studio',
            productCount: prodCount ?? 0,
            hasStudio: (studioCount ?? 0) > 0,
            showRejectInput: false,
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

    // Note: rejection email is sent via a Supabase trigger or edge function
    // configured separately in the Supabase dashboard
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

          {/* Stats */}
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
            <div key={item.submissionId} className="vitrina-card">
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

              {/* Rejection reason (if already rejected) */}
              {item.status === 'rejected' && item.rejectionReason && (
                <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#ff9090' }}>
                  Motivo: {item.rejectionReason}
                </div>
              )}

              {/* Reject input */}
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
                {(item.status === 'pending') && (
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
                        <button className="btn btn-ghost btn-sm" onClick={() => updateItem(item.submissionId, { showRejectInput: false, rejectionReason: '' })}>
                          Cancelar
                        </button>
                        <button
                          className="btn btn-sm"
                          disabled={item.loading || !item.rejectionReason.trim()}
                          style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b', fontFamily: 'Montserrat, sans-serif', opacity: !item.rejectionReason.trim() ? 0.4 : 1 }}
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
