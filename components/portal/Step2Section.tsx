'use client'

import type { PortalState } from '@/lib/types'

interface Step2SectionProps {
  state: PortalState
  update: (patch: Partial<PortalState>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Section({ state, update, onNext, onBack }: Step2SectionProps) {
  function toggle(key: 'tienda' | 'estudios') {
    update({ sections: { ...state.sections, [key]: !state.sections[key] } })
  }

  const valid = state.sections.tienda || state.sections.estudios

  return (
    <div className="screen-anim">
      <div className="screen-title">
        ¿Qué quieres <span>publicar?</span>
      </div>
      <div className="screen-sub">Selecciona una o ambas secciones.</div>

      <div className="selector-grid">
        {/* Tienda */}
        <div
          className={`selector-card ${state.sections.tienda ? 'selected' : ''}`}
          onClick={() => toggle('tienda')}
        >
          <div className="selector-check">
            <svg viewBox="0 0 12 10">
              <polyline points="1,5 4,8 11,1" />
            </svg>
          </div>
          <div className="selector-card-title">Tienda</div>
          <div className="selector-card-desc">
            Vende tu obra original, réplicas, prints o productos artísticos directamente desde tu perfil Brocha.
          </div>
        </div>

        {/* Estudios */}
        <div
          className={`selector-card ${state.sections.estudios ? 'selected' : ''}`}
          onClick={() => toggle('estudios')}
        >
          <div className="selector-check">
            <svg viewBox="0 0 12 10">
              <polyline points="1,5 4,8 11,1" />
            </svg>
          </div>
          <div className="selector-card-title">Estudios</div>
          <div className="selector-card-desc">
            Comparte sesiones pregrabadas de tu proceso creativo. Enseña tu técnica al mundo.
          </div>
        </div>
      </div>

      <div className="action-row">
        <button className="btn btn-ghost" onClick={onBack}>← Volver</button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!valid}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
