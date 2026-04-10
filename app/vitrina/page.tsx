'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

type Status = 'pending' | 'approved' | 'published' | 'rejected'

interface SubmissionItem {
  id: string
  status: Status
  created_at: string
  rejection_reason: string | null
  // joined content
  type: 'product' | 'studio'
  title: string
  description: string
  price: number
  image_urls?: string[]
  // for inline editing
  editPrice: string
  editDescription: string
  editing: boolean
  saving: boolean
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

export default function VitrinaPage() {
  const [items, setItems]     = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [artistName, setArtistName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Artist name
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      setArtistName(artist?.name || user.email || '')

      // Products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description, price, image_urls, created_at')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })

      // Studio
      const { data: studios } = await supabase
        .from('studios')
        .select('id, name, description, price, cover_url, created_at')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })

      // Submissions for status
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, status, created_at, rejection_reason')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })

      // Build items list — products first, then studios
      const rows: SubmissionItem[] = []

      // For now map each product to a submission (1 submission per artist)
      // In future each product/studio will have its own submission
      const sub = submissions?.[0]

      ;(products ?? []).forEach((p: { id: string; name: string; description: string; price: number; image_urls: string[]; created_at: string }) => {
        rows.push({
          id: p.id,
          status: (sub?.status ?? 'pending') as Status,
          created_at: p.created_at,
          rejection_reason: sub?.rejection_reason ?? null,
          type: 'product',
          title: p.name,
          description: p.description,
          price: p.price,
          image_urls: p.image_urls ?? [],
          editPrice: String(p.price),
          editDescription: p.description,
          editing: false,
          saving: false,
        })
      })

      ;(studios ?? []).forEach((s: { id: string; name: string; description: string; price: number; cover_url: string; created_at: string }) => {
        rows.push({
          id: s.id,
          status: (sub?.status ?? 'pending') as Status,
          created_at: s.created_at,
          rejection_reason: sub?.rejection_reason ?? null,
          type: 'studio',
          title: s.name,
          description: s.description,
          price: s.price,
          image_urls: s.cover_url ? [s.cover_url] : [],
          editPrice: String(s.price),
          editDescription: s.description,
          editing: false,
          saving: false,
        })
      })

      setItems(rows)
      setLoading(false)
    }
    load()
  }, [router, supabase])

  function updateItem(id: string, patch: Partial<SubmissionItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  async function handlePublish(item: SubmissionItem) {
    updateItem(item.id, { saving: true })
    // Update submission status to published
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'published' })
      .eq('artist_id', (await supabase.auth.getUser()).data.user?.id)

    if (!error) updateItem(item.id, { status: 'published', saving: false })
    else updateItem(item.id, { saving: false })
  }

  async function handleSaveEdit(item: SubmissionItem) {
    updateItem(item.id, { saving: true })
    const table = item.type === 'product' ? 'products' : 'studios'
    const { error } = await supabase
      .from(table)
      .update({
        description: item.editDescription,
        price: parseFloat(item.editPrice) || item.price,
      })
      .eq('id', item.id)

    if (!error) {
      updateItem(item.id, {
        description: item.editDescription,
        price: parseFloat(item.editPrice) || item.price,
        editing: false,
        saving: false,
      })
    } else {
      updateItem(item.id, { saving: false })
    }
  }

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
        <div className="nav-artist">
          <div className="nav-avatar">
            {artistName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || '?'}
          </div>
          <span className="nav-name">{artistName}</span>
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12, marginLeft: 4 }} onClick={() => router.push('/dashboard')}>
            ← Inicio
          </button>
        </div>
      </nav>

      <main className="portal-main">
        <div className="screen-anim">
          <h1 className="screen-title" style={{ marginBottom: 6 }}>Mi <span>Vitrina</span></h1>
          <p className="screen-sub">Todo tu contenido enviado y su estado de revisión.</p>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
              <p style={{ fontSize: 14 }}>Aún no has enviado contenido.</p>
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/portal?mode=contenido')}>
                Agregar contenido
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="vitrina-card">
                <div className="vitrina-card-header">
                  <div>
                    <div className="vitrina-card-title">{item.title || '(Sin título)'}</div>
                    <div className="vitrina-card-meta" style={{ marginTop: 4 }}>
                      {item.type === 'product' ? 'Producto / Obra' : 'Estudio'} · {new Date(item.created_at).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                  <span className={`status-badge ${STATUS_CLASS[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>

                {/* Thumbnail */}
                {item.image_urls && item.image_urls.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {item.image_urls.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '0.5px solid rgba(116,84,232,0.3)' }} />
                    ))}
                  </div>
                )}

                {/* Description + price — editable if approved or published */}
                {item.editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <div className="field">
                      <label className="field-label" style={{ fontSize: 10, letterSpacing: 1 }}>Descripción</label>
                      <textarea
                        className="field-input"
                        style={{ minHeight: 80, resize: 'vertical' }}
                        value={item.editDescription}
                        onChange={e => updateItem(item.id, { editDescription: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label" style={{ fontSize: 10, letterSpacing: 1 }}>Precio (USD)</label>
                      <input
                        type="number"
                        className="field-input"
                        value={item.editPrice}
                        onChange={e => updateItem(item.id, { editPrice: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="vitrina-card-body">
                    <p style={{ margin: '0 0 4px' }}>{item.description || <em style={{ opacity: 0.4 }}>Sin descripción</em>}</p>
                    <span style={{ color: '#fff56e', fontWeight: 700 }}>${item.price} USD</span>
                  </div>
                )}

                {/* Rejection message */}
                {item.status === 'rejected' && item.rejection_reason && (
                  <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#ff9090', lineHeight: 1.6 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Motivo del rechazo:</strong>
                    {item.rejection_reason}
                  </div>
                )}

                {/* Actions */}
                <div className="vitrina-card-actions">
                  {/* Pending — locked */}
                  {item.status === 'pending' && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                      En espera de revisión por el equipo Brocha…
                    </span>
                  )}

                  {/* Approved — can edit + publish */}
                  {item.status === 'approved' && !item.editing && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateItem(item.id, { editing: true })}>
                        ✏️ Editar precio / descripción
                      </button>
                      <button
                        className="btn btn-yellow btn-sm"
                        disabled={item.saving}
                        onClick={() => handlePublish(item)}
                      >
                        {item.saving ? 'Publicando…' : 'Publicar →'}
                      </button>
                    </>
                  )}

                  {item.status === 'approved' && item.editing && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateItem(item.id, { editing: false, editPrice: String(item.price), editDescription: item.description })}>
                        Cancelar
                      </button>
                      <button className="btn btn-primary btn-sm" disabled={item.saving} onClick={() => handleSaveEdit(item)}>
                        {item.saving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </>
                  )}

                  {/* Published — edit only price/desc */}
                  {item.status === 'published' && !item.editing && (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateItem(item.id, { editing: true })}>
                      ✏️ Editar precio / descripción
                    </button>
                  )}

                  {item.status === 'published' && item.editing && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateItem(item.id, { editing: false, editPrice: String(item.price), editDescription: item.description })}>
                        Cancelar
                      </button>
                      <button className="btn btn-primary btn-sm" disabled={item.saving} onClick={() => handleSaveEdit(item)}>
                        {item.saving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </>
                  )}

                  {/* Rejected — contact message */}
                  {item.status === 'rejected' && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                      Contacta al equipo Brocha para republicar este contenido.
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
