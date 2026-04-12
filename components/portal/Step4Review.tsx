'use client'

import type { PortalState } from '@/lib/types'

interface Step4ReviewProps {
  state: PortalState
  onBack: () => void
  onEdit: (step: 1 | 2 | 3, screen?: 'tienda' | 'estudios') => void
  onSubmit: () => void
  submitting: boolean
}

export default function Step4Review({ state, onBack, onEdit, onSubmit, submitting }: Step4ReviewProps) {
  const totalSessions = state.studio.modules.reduce((a, m) => a + m.sessions.length, 0)

  return (
    <div className="screen-anim">
      <div className="screen-title">Revisa tu <span>material</span></div>
      <div className="screen-sub">Confirma que todo esté correcto antes de enviar al equipo Brocha.</div>

      {/* Tienda */}
      {state.sections.tienda && (
        <div className="review-card">
          <div className="review-card-title">
            Tienda
            <button className="review-edit" onClick={() => onEdit(3, 'tienda')}>Editar</button>
          </div>
          {state.products.map((p, i) => (
            <div
              key={p.id}
              style={{
                marginBottom: i < state.products.length - 1 ? 20 : 0,
                paddingBottom: i < state.products.length - 1 ? 20 : 0,
                borderBottom: i < state.products.length - 1 ? '0.5px solid var(--pb)' : 'none',
              }}
            >
              {/* Product header */}
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Producto {i + 1} · {p.type}
              </div>

              {/* Images */}
              {(p.imageFiles.length > 0 || p.imageUrls.length > 0) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {/* New files (not yet uploaded) */}
                  {p.imageFiles.map((file, fi) => (
                    <img
                      key={`file-${fi}`}
                      src={URL.createObjectURL(file)}
                      alt={`Imagen ${fi + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '0.5px solid var(--pb)' }}
                    />
                  ))}
                  {/* Already-uploaded URLs */}
                  {p.imageUrls.map((url, ui) => (
                    <img
                      key={`url-${ui}`}
                      src={url}
                      alt={`Imagen ${ui + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '0.5px solid var(--pb)' }}
                    />
                  ))}
                </div>
              )}

              {/* All fields */}
              <div className="review-row">
                <span className="review-key">Título</span>
                <span className="review-val">{p.title || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Descripción</span>
                <span className="review-val" style={{ whiteSpace: 'pre-wrap' }}>{p.description || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Técnica</span>
                <span className="review-val">{p.technique || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Año</span>
                <span className="review-val">{p.year || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Dimensiones</span>
                <span className="review-val">{p.dimensions || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Precio</span>
                <span className="review-val" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
                  {p.price ? '$' + parseInt(p.price).toLocaleString('es-CO') : '—'}
                </span>
              </div>
              <div className="review-row">
                <span className="review-key">Stock</span>
                <span className="review-val">{p.stock || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Envío</span>
                <span className="review-val">{p.shippingOption || '—'}</span>
              </div>
              {p.shippingCountries.length > 0 && (
                <div className="review-row">
                  <span className="review-key">Países</span>
                  <span className="review-val">{p.shippingCountries.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Estudios */}
      {state.sections.estudios && (
        <div className="review-card">
          <div className="review-card-title">
            Estudios
            <button className="review-edit" onClick={() => onEdit(3, 'estudios')}>Editar</button>
          </div>

          {/* Cover image */}
          {(state.studio.coverFiles.length > 0 || state.studio.coverUrls.length > 0) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {state.studio.coverFiles.map((file, fi) => (
                <img
                  key={`cover-${fi}`}
                  src={URL.createObjectURL(file)}
                  alt="Portada"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '0.5px solid var(--pb)' }}
                />
              ))}
              {state.studio.coverUrls.map((url, ui) => (
                <img
                  key={`coverurl-${ui}`}
                  src={url}
                  alt="Portada"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '0.5px solid var(--pb)' }}
                />
              ))}
            </div>
          )}

          <div className="review-row">
            <span className="review-key">Nombre</span>
            <span className="review-val">{state.studio.title || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-key">Descripción</span>
            <span className="review-val" style={{ whiteSpace: 'pre-wrap' }}>{state.studio.description || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-key">Nivel</span>
            <span className="review-val">{state.studio.level || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-key">Precio</span>
            <span className="review-val" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
              {state.studio.price ? '$' + parseInt(state.studio.price).toLocaleString('es-CO') : '—'}
            </span>
          </div>
          {state.studio.introVideoName && (
            <div className="review-row">
              <span className="review-key">Video promo</span>
              <span className="review-val">{state.studio.introVideoName}</span>
            </div>
          )}
          <div className="review-row">
            <span className="review-key">Módulos</span>
            <span className="review-val">
              {state.studio.modules.length} módulo{state.studio.modules.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="review-row">
            <span className="review-key">Sesiones</span>
            <span className="review-val">
              {totalSessions} sesión{totalSessions !== 1 ? 'es' : ''}
            </span>
          </div>
          {state.studio.resources.length > 0 && (
            <div className="review-row">
              <span className="review-key">Recursos</span>
              <span className="review-val">
                {state.studio.resources.length} recurso{state.studio.resources.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Module detail */}
          {state.studio.modules.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--pb)' }}>
              {state.studio.modules.map((m, mi) => (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>
                    Módulo {mi + 1}: {m.title || '(Sin título)'}
                  </div>
                  {m.sessions.map((s, si) => (
                    <div key={s.id} style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 12, marginBottom: 2 }}>
                      · Sesión {si + 1}: {s.title || '(Sin título)'}
                      {s.videoName && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}> — {s.videoName}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ¿Qué pasa ahora? */}
      <div className="review-card" style={{ background: 'rgba(255,245,110,0.04)', borderColor: 'rgba(255,245,110,0.2)' }}>
        <div className="review-card-title" style={{ color: 'var(--yellow)' }}>¿Qué pasa ahora?</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2.2 }}>
          1 · El equipo Brocha recibe una notificación con tu material<br/>
          2 · Revisión editorial en máximo 72 horas<br/>
          3 · Recibes confirmación y tu contenido queda disponible en tu vitrina
        </div>
      </div>

      <div className="action-row">
        <button className="btn btn-ghost" onClick={onBack} disabled={submitting}>← Volver</button>
        <button className="btn btn-yellow" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar material →'}
        </button>
      </div>
    </div>
  )
}
