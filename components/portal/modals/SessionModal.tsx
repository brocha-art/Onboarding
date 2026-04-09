'use client'

import { useRef, useState } from 'react'
import type { Session } from '@/lib/types'
import { makeSession } from '@/lib/types'

interface SessionModalProps {
  session?: Session
  moduleTitle: string
  onSave: (s: Session) => void
  onClose: () => void
}

export default function SessionModal({ session, moduleTitle, onSave, onClose }: SessionModalProps) {
  const [form, setForm] = useState<Session>(session ?? makeSession())
  const videoRef = useRef<HTMLInputElement>(null)
  const [videoLabel, setVideoLabel] = useState(session?.videoName ? `✓ ${session.videoName}` : 'Arrastra o selecciona el video')
  const [dragOver, setDragOver] = useState(false)

  function update(patch: Partial<Session>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleVideo(file: File | null) {
    if (!file) return
    update({ videoFile: file, videoName: file.name })
    setVideoLabel(`✓ ${file.name}`)
  }

  const valid = form.title.trim().length > 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {session ? 'Editar sesión' : 'Nueva sesión'}
        </div>
        <div className="modal-sub">
          {moduleTitle ? `Módulo: ${moduleTitle}` : 'Añade el detalle de esta sesión.'}
        </div>

        <div className="field">
          <label>Título de la sesión</label>
          <input
            type="text"
            placeholder="Ej: Técnicas de sombreado"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Descripción <span className="optional-tag">opcional</span></label>
          <textarea
            style={{ minHeight: 70 }}
            placeholder="¿Qué cubre esta sesión? ¿Cuánto dura?"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Video de la sesión</label>
          <div
            className={`upload-zone ${dragOver ? 'drag' : ''}`}
            style={{ padding: 22 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleVideo(e.dataTransfer.files[0]) }}
            onClick={() => videoRef.current?.click()}
          >
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleVideo(e.target.files?.[0] ?? null)}
            />
            <div className="upload-icon">
              <svg viewBox="0 0 24 24">
                <polygon points="23,7 16,12 23,17"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>
            <div className="upload-label">{videoLabel}</div>
            <div className="upload-hint">MP4, MOV · Máx. 2 GB</div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => valid && onSave(form)}
            disabled={!valid}
          >
            Guardar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
