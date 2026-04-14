'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function DashboardPage() {
  const [artistName, setArtistName] = useState('')
  const [loading, setLoading]       = useState(true)
  const [isAdmin, setIsAdmin]       = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get display name
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

      const name = artist?.name
        || user.user_metadata?.full_name
        || (user.email ?? '').split('@')[0]
      setArtistName(name)

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const firstName = artistName.split(' ')[0]

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
            {artistName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'}
          </div>
          <span className="nav-name">{artistName}</span>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 12, marginLeft: 8 }}
            onClick={handleSignOut}
          >
            Salir
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', minHeight: 'calc(100vh - 80px)' }}>

        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 10, letterSpacing: '-0.5px' }}>
            Hola, <span style={{ color: '#fff56e' }}>{firstName}</span> 👋
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            ¿Qué quieres hacer hoy?
          </p>
        </div>

        {/* Cards */}
        <div className="dashboard-cards">

          {/* Perfil */}
          <button className="dash-card" onClick={() => router.push('/profile')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div className="dash-card-title">Perfil</div>
            <div className="dash-card-desc">Edita tu información y foto de artista</div>
          </button>

          {/* Agregar contenido */}
          <button className="dash-card" onClick={() => router.push('/portal?mode=contenido')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div className="dash-card-title">Agregar contenido</div>
            <div className="dash-card-desc">Sube productos, obras o módulos de estudio</div>
          </button>

          {/* Vitrina */}
          <button className="dash-card" onClick={() => router.push('/vitrina')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="dash-card-title">Vitrina</div>
            <div className="dash-card-desc">Revisa y publica tu contenido aprobado</div>
          </button>

        </div>

        {/* Admin shortcut */}
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(116,84,232,0.15)', border: '1px solid rgba(116,84,232,0.4)', borderRadius: 10, padding: '10px 20px', color: '#7454e8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.5 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Panel de administración
          </button>
        )}

      </main>
    </div>
  )
}
