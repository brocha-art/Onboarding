'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      setError(
        error.message === 'Signups not allowed for otp'
          ? 'Este correo no está registrado en Brocha.'
          : 'Error al enviar el código. Intenta de nuevo.'
      )
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          brocha<span>.</span>
        </div>

        {!sent ? (
          <>
            <h1 className="auth-title">Bienvenida de nuevo</h1>
            <p className="auth-sub">
              Ingresa tu correo y te enviaremos un código de acceso.
            </p>

            <form onSubmit={handleSendOTP} style={{ width: '100%', textAlign: 'left' }}>
              <div className="field-group" style={{ marginBottom: 20 }}>
                <label className="field-label">Correo electrónico</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="auth-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-yellow"
                disabled={loading || !email.trim()}
                style={{ width: '100%' }}
              >
                {loading ? 'Enviando...' : 'Enviar código →'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
            <h1 className="auth-title">Revisa tu correo</h1>
            <p className="auth-sub">
              Enviamos un código de 6 dígitos a{' '}
              <strong style={{ color: 'var(--dim)' }}>{email}</strong>.
            </p>

            <button
              className="btn btn-yellow"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={() => router.push(`/auth/verify?email=${encodeURIComponent(email)}`)}
            >
              Ingresar código →
            </button>

            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => { setSent(false); setError(null) }}
            >
              Cambiar correo
            </button>
          </>
        )}

      </div>
    </div>
  )
}
