'use client'

import { useState } from 'react'
import type { Module } from '@/lib/types'
import { makeModule } from '@/lib/types'

interface ModuleModalProps {
  module?: Module
  onSave: (m: Module) => void
  onClose: () => void
}

export default function ModuleModal({ module, onSave, onClose }: ModuleModalProps) {
  const [form, setForm] = useState<Module>(module ?? makeModule())

  function update(patch: Partial<Module>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const valid = form.title.trim().length > 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {module ? 'Editar módulo' : 'Nuevo módulo'}
        </div>
        <div className="modal-sub">Los módulos agrupan sesiones temáticamente.</div>

        <div className="field">
          <label>Nombre del módulo</label>
          <input
            type="text"
            placeholder="Ej: Módulo 1 · Fundamentos"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Descripción <span className="optional-tag">opcional</span></label>
          <textarea
            style={{ minHeight: 70 }}
            placeholder="¿Qué cubre este módulo?"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => valid && onSave(form)}
            disabled={!valid}
          >
            {module ? 'Guardar cambios' : 'Crear módulo'}
          </button>
        </div>
      </div>
    </div>
  )
}
