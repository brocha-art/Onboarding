'use client'

import { useRef, useState } from 'react'
import type { PortalState, Module, Session, Resource, Studio } from '@/lib/types'
import { makeModule, makeSession, LEVELS } from '@/lib/types'
import ModuleModal from './modals/ModuleModal'
import SessionModal from './modals/SessionModal'
import ResourceModal from './modals/ResourceModal'

interface Step3EstudiosProps {
  state: PortalState
  update: (patch: Partial<PortalState>) => void
  onNext: () => void
  onBack: () => void
}

type ModalState =
  | { type: 'module'; module?: Module }
  | { type: 'session'; moduleId: string; session?: Session }
  | { type: 'resource'; resource?: Resource }
  | null

export default function Step3Estudios({ state, update, onNext, onBack }: Step3EstudiosProps) {
  const [modal, setModal] = useState<ModalState>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [coverDrag, setCoverDrag] = useState(false)
  const [videoDrag, setVideoDrag] = useState(false)

  const studio = state.studio

  function updateStudio(patch: Partial<Studio>) {
    update({ studio: { ...studio, ...patch } })
  }

  function handleCoverFile(file: File) {
    const url = URL.createObjectURL(file)
    updateStudio({
      coverFiles: [file],
      coverUrls: [url],
    })
  }

  function handleVideoFile(file: File) {
    updateStudio({ introVideoFile: file, introVideoName: file.name })
  }

  // Module operations
  function saveModule(m: Module) {
    const existing = studio.modules.findIndex((mod) => mod.id === m.id)
    if (existing >= 0) {
      const updated = [...studio.modules]
      updated[existing] = m
      updateStudio({ modules: updated })
    } else {
      updateStudio({ modules: [...studio.modules, { ...m, title: m.title || `Módulo ${studio.modules.length + 1}` }] })
    }
    setModal(null)
  }

  function removeModule(id: string) {
    let modules = studio.modules.filter((m) => m.id !== id)
    if (modules.length === 0) modules = [makeModule()]
    updateStudio({ modules })
  }

  // Session operations
  function saveSession(moduleId: string, s: Session) {
    const updated = studio.modules.map((m) => {
      if (m.id !== moduleId) return m
      const existing = m.sessions.findIndex((sess) => sess.id === s.id)
      if (existing >= 0) {
        const sessions = [...m.sessions]
        sessions[existing] = s
        return { ...m, sessions }
      }
      return { ...m, sessions: [...m.sessions, s] }
    })
    updateStudio({ modules: updated })
    setModal(null)
  }

  function removeSession(moduleId: string, sessionId: string) {
    const updated = studio.modules.map((m) => {
      if (m.id !== moduleId) return m
      return { ...m, sessions: m.sessions.filter((s) => s.id !== sessionId) }
    })
    updateStudio({ modules: updated })
  }

  // Resource operations
  function saveResource(r: Resource) {
    const existing = studio.resources.findIndex((res) => res.id === r.id)
    if (existing >= 0) {
      const updated = [...studio.resources]
      updated[existing] = r
      updateStudio({ resources: updated })
    } else {
      updateStudio({ resources: [...studio.resources, r] })
    }
    setModal(null)
  }

  function removeResource(id: string) {
    updateStudio({ resources: studio.resources.filter((r) => r.id !== id) })
  }

  return (
    <div className="screen-anim">
      <div className="screen-title">Tus <span>Estudios</span></div>
      <div className="screen-sub">Crea tu Estudio y organiza las sesiones.</div>

      {/* Información del Estudio */}
      <div className="form-section">
        <div className="fsect-title">Información del Estudio</div>
        <div className="field">
          <label>Nombre del Estudio</label>
          <input
            type="text"
            placeholder="Ej: Taller de acuarela botánica"
            value={studio.title}
            onChange={(e) => updateStudio({ title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea
            maxLength={500}
            placeholder="¿Qué aprenderán? ¿A quién va dirigido? ¿Qué materiales necesitan?"
            value={studio.description}
            onChange={(e) => updateStudio({ description: e.target.value })}
          />
          <div className="char-hint"><span>{studio.description.length}</span>/500</div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Nivel</label>
            <select
              value={studio.level}
              onChange={(e) => updateStudio({ level: e.target.value })}
            >
              <option value="">Selecciona nivel</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Precio (COP)</label>
            <div className="price-wrap">
              <span className="currency">$</span>
              <input
                type="number"
                placeholder="180.000"
                value={studio.price}
                onChange={(e) => updateStudio({ price: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Portada e introducción */}
      <div className="form-section">
        <div className="fsect-title">Portada e introducción</div>
        <div className="field-row">
          <div className="field">
            <label>Imagen de portada</label>
            <div
              className={`upload-zone ${coverDrag ? 'drag' : ''}`}
              style={{ padding: 20 }}
              onDragOver={(e) => { e.preventDefault(); setCoverDrag(true) }}
              onDragLeave={() => setCoverDrag(false)}
              onDrop={(e) => { e.preventDefault(); setCoverDrag(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f) }}
              onClick={() => coverRef.current?.click()}
            >
              <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f) }} />
              {studio.coverUrls[0] ? (
                <img src={studio.coverUrls[0]} alt="portada" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
              ) : (
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </div>
              )}
              <div className="upload-label" style={{ fontSize: 12 }}>
                {studio.coverFiles[0] ? studio.coverFiles[0].name : 'Subir portada'}
              </div>
              <div className="upload-hint">JPG, PNG · Máx. 5 MB</div>
            </div>
          </div>
          <div className="field">
            <label>Video introductorio <span className="optional-tag">opcional</span></label>
            <div
              className={`upload-zone ${videoDrag ? 'drag' : ''}`}
              style={{ padding: 20 }}
              onDragOver={(e) => { e.preventDefault(); setVideoDrag(true) }}
              onDragLeave={() => setVideoDrag(false)}
              onDrop={(e) => { e.preventDefault(); setVideoDrag(false); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f) }}
              onClick={() => videoRef.current?.click()}
            >
              <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f) }} />
              <div className="upload-icon">
                <svg viewBox="0 0 24 24">
                  <polygon points="23,7 16,12 23,17"/>
                  <rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </div>
              <div className="upload-label" style={{ fontSize: 12 }}>
                {studio.introVideoName ? `✓ ${studio.introVideoName}` : 'Subir video intro'}
              </div>
              <div className="upload-hint">MP4, MOV · Máx. 500 MB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos y sesiones */}
      <div className="form-section">
        <div className="fsect-title">Módulos y sesiones</div>

        {studio.modules.map((m, mi) => (
          <div key={m.id} className="module-block">
            <div className="module-header">
              <div>
                <div className="module-title-label">{m.title || `Módulo ${mi + 1}`}</div>
                {m.description && <div className="module-desc-text">{m.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="module-remove"
                  style={{ fontSize: 14, color: 'var(--purple)', opacity: 0.8 }}
                  onClick={() => setModal({ type: 'module', module: m })}
                  title="Editar módulo"
                >✎</button>
                <button className="module-remove" onClick={() => removeModule(m.id)} title="Eliminar módulo">×</button>
              </div>
            </div>

            <div className="sessions-in-module">
              {m.sessions.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>Sin sesiones aún</div>
              )}
              {m.sessions.map((s, si) => (
                <div key={s.id} className="session-card">
                  <div className="session-num">{si + 1}</div>
                  <div className="session-info">
                    <div className="session-title-text">{s.title}</div>
                    <div className="session-sub-text">
                      {s.videoFile ? '✓ Video adjunto' : 'Sin video adjunto aún'}
                    </div>
                  </div>
                  <button
                    className="session-remove"
                    onClick={() => removeSession(m.id, s.id)}
                  >×</button>
                </div>
              ))}
            </div>

            <button
              className="add-session-btn"
              onClick={() => setModal({ type: 'session', moduleId: m.id })}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Añadir sesión a este módulo
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="add-session-btn"
            style={{ flex: 1 }}
            onClick={() => setModal({ type: 'module' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo módulo
          </button>
          {studio.modules.length > 0 && (
            <button
              className="add-session-btn"
              style={{ flex: 1 }}
              onClick={() => setModal({ type: 'session', moduleId: studio.modules[studio.modules.length - 1].id })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Añadir sesión
            </button>
          )}
        </div>
      </div>

      {/* Recursos adicionales */}
      <div className="form-section">
        <div className="fsect-title">
          Recursos adicionales <span className="optional-tag">opcional</span>
        </div>

        {studio.resources.map((r) => (
          <div key={r.id} className="resource-item">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pg)', border: '0.5px solid var(--pb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div className="resource-info">
              <div className="resource-name">{r.name}</div>
              <div className="resource-type">{r.type}</div>
            </div>
            <button className="resource-remove" onClick={() => removeResource(r.id)}>×</button>
          </div>
        ))}

        <button className="add-resource-btn" onClick={() => setModal({ type: 'resource' })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Añadir recurso (PDF, link, plantilla...)
        </button>
      </div>

      <div className="action-row">
        <button className="btn btn-ghost" onClick={onBack}>← Volver</button>
        <button className="btn btn-primary" onClick={onNext}>Continuar →</button>
      </div>

      {/* Modals */}
      {modal?.type === 'module' && (
        <ModuleModal
          module={modal.module}
          onSave={saveModule}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'session' && (
        <SessionModal
          session={modal.session}
          moduleTitle={studio.modules.find((m) => m.id === modal.moduleId)?.title ?? ''}
          onSave={(s) => saveSession(modal.moduleId, s)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'resource' && (
        <ResourceModal
          resource={modal.resource}
          onSave={saveResource}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
