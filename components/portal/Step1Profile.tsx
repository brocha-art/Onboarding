'use client'

import { useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/types'
import type { PortalState } from '@/lib/types'

interface Step1ProfileProps {
  state: PortalState
  update: (patch: Partial<PortalState>) => void
  onNext: () => void
}

export default function Step1Profile({ state, update, onNext }: Step1ProfileProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const firstName = state.artistName.split(' ')[0] || 'artista'

  function handlePhotoFile(file: File) {
    const url = URL.createObjectURL(file)
    update({ profilePhotoFile: file, profilePhotoUrl: url })
  }

  return (
    <div className="screen-anim">
      <div className="screen-title">
        Hola, <span>{firstName}</span> 👋
      </div>
      <div className="screen-sub">Confirmemos tu perfil antes de subir tu material.</div>

      {/* Información básica */}
      <div className="form-section">
        <div className="fsect-title">Información básica</div>
        <div className="field-row">
          <div className="field">
            <label>Nombre artístico</label>
            <input
              type="text"
              placeholder="Tu nombre o alias"
              value={state.artistName}
              onChange={(e) => update({ artistName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>País</label>
            <select
              value={state.country}
              onChange={(e) => update({ country: e.target.value })}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Bio corta</label>
          <textarea
            maxLength={300}
            value={state.bio}
            onChange={(e) => update({ bio: e.target.value })}
          />
          <div className="char-hint">
            <span>{state.bio.length}</span>/300
          </div>
        </div>
      </div>

      {/* Foto de perfil */}
      <div className="form-section">
        <div className="fsect-title">Foto de perfil</div>
        <div
          className={`upload-zone ${dragOver ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f && f.type.startsWith('image/')) handlePhotoFile(f)
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handlePhotoFile(f)
            }}
          />

          {state.profilePhotoUrl ? (
            <img
              src={state.profilePhotoUrl}
              alt="perfil"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', margin: '0 auto 10px', display: 'block',
                border: '2px solid var(--purple)',
              }}
            />
          ) : (
            <div className="upload-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          )}

          <div className="upload-label" style={{ fontSize: state.profilePhotoUrl ? 12 : 13 }}>
            {state.profilePhotoFile ? state.profilePhotoFile.name : 'Sube tu foto de perfil'}
          </div>
          <div className="upload-hint">JPG, PNG · Máx. 5 MB</div>
        </div>
      </div>

      {/* Redes sociales */}
      <div className="form-section">
        <div className="fsect-title">Redes sociales</div>
        <div className="field-row">
          <div className="field">
            <label>Instagram</label>
            <input
              type="text"
              value={state.instagram}
              onChange={(e) => update({ instagram: e.target.value })}
            />
          </div>
          <div className="field">
            <label>
              Website <span className="optional-tag">opcional</span>
            </label>
            <input
              type="text"
              placeholder="www.tuportafolio.com"
              value={state.website}
              onChange={(e) => update({ website: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="action-row">
        <div />
        <button className="btn btn-primary" onClick={onNext}>
          Continuar →
        </button>
      </div>
    </div>
  )
}
