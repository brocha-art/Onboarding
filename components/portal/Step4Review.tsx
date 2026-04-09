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

      {/* Perfil */}
      <div className="review-card">
        <div className="review-card-title">
          Perfil de artista
          <button className="review-edit" onClick={() => onEdit(1)}>Editar</button>
        </div>
        <div className="review-row">
          <span className="review-key">Nombre</span>
          <span className="review-val">{state.artistName || '—'}</span>
        </div>
        <div className="review-row">
          <span className="review-key">País</span>
          <span className="review-val">{state.country || '—'}</span>
        </div>
        <div className="review-row">
          <span className="review-key">Instagram</span>
          <span className="review-val">{state.instagram || '—'}</span>
        </div>
      </div>

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
                marginBottom: i < state.products.length - 1 ? 14 : 0,
                paddingBottom: i < state.products.length - 1 ? 14 : 0,
                borderBottom: i < state.products.length - 1 ? '0.5px solid var(--pb)' : 'none',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Producto {i + 1} · {p.type}
              </div>
              <div className="review-row">
                <span className="review-key">Título</span>
                <span className="review-val">{p.title || 'Sin título'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Técnica</span>
                <span className="review-val">{p.technique || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-key">Precio</span>
                <span className="review-val">
                  {p.price ? '$' + parseInt(p.price).toLocaleString('es-CO') : '—'}
                </span>
              </div>
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
          <div className="review-row">
            <span className="review-key">Estudio</span>
            <span className="review-val">{state.studio.title || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-key">Nivel</span>
            <span className="review-val">{state.studio.level || '—'}</span>
          </div>
          <div className="review-row">
            <span className="review-key">Precio</span>
            <span className="review-val">
              {state.studio.price ? '$' + parseInt(state.studio.price).toLocaleString('es-CO') : '—'}
            </span>
          </div>
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
        </div>
      )}

      {/* ¿Qué pasa ahora? */}
      <div className="review-card" style={{ background: 'rgba(253,255,132,0.04)', borderColor: 'rgba(253,255,132,0.2)' }}>
        <div className="review-card-title" style={{ color: 'var(--yellow)' }}>¿Qué pasa ahora?</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2.2 }}>
          1 · El equipo Brocha recibe una notificación con tu material<br/>
          2 · Revisión editorial en máximo 72 horas<br/>
          3 · Recibes confirmación y tu contenido queda publicado
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
