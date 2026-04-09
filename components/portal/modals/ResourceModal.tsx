'use client'

import { useRef, useState } from 'react'
import type { Resource } from '@/lib/types'
import { makeResource, RESOURCE_TYPES } from '@/lib/types'

interface ResourceModalProps {
  resource?: Resource
  onSave: (r: Resource) => void
  onClose: () => void
}

export default function ResourceModal({ resource, onSave, onClose }: ResourceModalProps) {
  const [form, setForm] = useState<Resource>(resource ?? makeResource())
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileLabel, setFileLabel] = useState(resource?.fileName ? `✓ ${resource.fileName}` : 'Subir archivo')
  const [dragOver, setDragOver] = useState(false)

  function update(patch: Partial<Resource>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleFile(file: File | null) {
    if (!file) return
    update({ file, fileName: file.name })
    setFileLabel(`✓ ${file.name}`)
  }

  const isLink = form.type === 'Link externo'
  const valid = form.name.trim().length > 0 && form.type.length > 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Recurso adicional</div>
        <div className="modal-sub">Agrega materiales de apoyo para tus aprendices.</div>

        <div className="field">
          <label>Nombre del recurso</label>
          <input
            type="text"
            placeholder="Ej: Guía de materiales"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Tipo de recurso</label>
          <select
            value={form.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            <option value="">Selecciona el tipo</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* File upload (hidden for Link externo) */}
        {!isLink && (
          <div className="field">
            <label>Archivo <span className="optional-tag">si aplica</span></label>
            <div
              className={`upload-zone ${dragOver ? 'drag' : ''}`}
              style={{ padding: 20 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <div className="upload-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
              </div>
              <div className="upload-label" style={{ fontSize: 12 }}>{fileLabel}</div>
              <div className="upload-hint">PDF, PNG, ZIP · Máx. 50 MB</div>
            </div>
          </div>
        )}

        {/* URL (shown for Link externo) */}
        {isLink && (
          <div className="field">
            <label>URL del recurso</label>
            <input
              type="text"
              placeholder="https://"
              value={form.url}
              onChange={(e) => update({ url: e.target.value })}
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => valid && onSave(form)}
            disabled={!valid}
          >
            Guardar recurso
          </button>
        </div>
      </div>
    </div>
  )
}
