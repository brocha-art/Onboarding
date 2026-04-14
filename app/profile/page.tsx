'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { uploadFile, generatePath } from '@/lib/supabase'
import { COUNTRIES } from '@/lib/types'

export default function ProfilePage() {
  const [loading, setLoading]  = useState(true)
  const [saving, setSaving]    = useState(false)
  const [saved, setSaved]      = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [artistId, setArtistId] = useState('')

  // Form fields
  const [name, setName]           = useState('')
  const [country, setCountry]     = useState('')
  const [bio, setBio]             = useState('')
  const [instagram, setInstagram] = useState('')
  const [website, setWebsite]     = useState('')
  const [photoUrl, setPhotoUrl]   = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setArtistId(user.id)

      const { data: artist } = await supabase
        .from('artists')
        .select('name, country, bio, instagram, website, profile_photo_url')
        .eq('id', user.id)
        .maybeSingle()

      if (artist) {
        setName(artist.name ?? '')
        setCountry(artist.country ?? '')
        setBio(artist.bio ?? '')
        setInstagram(artist.instagram ?? '')
        setWebsite(artist.website ?? '')
        setPhotoUrl(artist.profile_photo_url ?? '')
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    let finalPhotoUrl = photoUrl
    if (photoFile) {
      const uploaded = await uploadFile(
        'profile-photos',
        generatePath('photos', photoFile),
        photoFile
      )
      if (uploaded) finalPhotoUrl = uploaded
    }

    const { error: upsertError } = await supabase
      .from('artists')
      .upsert({
        id: artistId,
        name: name.trim(),
        country,
        bio: bio.trim(),
        instagram: instagram.trim(),
        website: website.trim(),
        profile_photo_url: finalPhotoUrl || null,
      })

    setSaving(false)

    if (upsertError) {
      setError('Error al guardar. Intenta de nuevo.')
      return
    }

    setPhotoUrl(finalPhotoUrl)
    setPhotoFile(null)
    setPhotoPreview('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3500)
  }

  const displayPhoto = photoPreview || photoUrl
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

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
      {/* Nav */}
      <nav className="portal-nav">
        <div className="logo">
          <img src="/brocha-logo.svg" alt="Brocha" style={{ height: 36, width: 'auto' }} />
        </div>
        <div className="nav-artist">
          <div className="nav-avatar">
            {displayPhoto
              ? <img src={displayPhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials || '?'}
          </div>
          <span className="nav-name">{name || 'Mi perfil'}</span>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 12, marginLeft: 4 }}
            onClick={() => router.push('/dashboard')}
          >
            ← Inicio
          </button>
        </div>
      </nav>

      <main className="portal-main">
        <form className="screen-anim" onSubmit={handleSave}>
          <div className="screen-title">Mi <span>Perfil</span></div>
          <div className="screen-sub">Tu información pública como artista en Brocha.</div>

          {/* Photo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, padding: '24px', background: 'rgba(116,84,232,0.05)', border: '1px solid rgba(116,84,232,0.15)', borderRadius: 16 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(116,84,232,0.2)',
                border: '2px solid rgba(116,84,232,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                fontSize: 22, fontWeight: 800, color: 'var(--purple)',
                position: 'relative',
              }}
            >
              {displayPhoto
                ? <img src={displayPhoto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials || '?'}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', fontSize: 18,
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                📷
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Foto de perfil</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>JPG o PNG · Máx 5MB · Aspecto cuadrado</div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileRef.current?.click()}
              >
                {photoFile ? '✓ ' + photoFile.name.slice(0, 20) : 'Cambiar foto'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Name */}
          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label">Nombre artístico *</label>
            <input
              type="text"
              className="field-input"
              placeholder="Tu nombre o nombre artístico"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Country */}
          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label">País</label>
            <select
              className="field-input"
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={{ appearance: 'none' }}
            >
              <option value="">Selecciona tu país</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label">Biografía</label>
            <textarea
              className="field-input"
              placeholder="Cuéntanos sobre ti, tu estilo y tu proceso creativo…"
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={{ minHeight: 120, resize: 'vertical' }}
              maxLength={500}
            />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
              {bio.length}/500
            </div>
          </div>

          {/* Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="field-group">
              <label className="field-label">Instagram</label>
              <input
                type="text"
                className="field-input"
                placeholder="@tuusuario"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Sitio web</label>
              <input
                type="url"
                className="field-input"
                placeholder="https://tu-sitio.com"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ff9090' }}>
              ❌ {error}
            </div>
          )}

          {saved && (
            <div style={{ background: 'rgba(80,200,120,0.1)', border: '1px solid rgba(80,200,120,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#50c878' }}>
              ✓ Perfil guardado correctamente
            </div>
          )}

          <div className="action-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push('/dashboard')}
            >
              ← Volver
            </button>
            <button
              type="submit"
              className="btn btn-yellow"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
