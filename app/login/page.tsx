'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [step, setStep]         = useState<'email' | 'otp'>('email')
  const [code, setCode]         = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent]     = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router    = useRouter()
  const supabase  = createClient()

  // Auto-focus first OTP box when step changes to otp
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }, [step])

  // ── Step 1: Send OTP ─────────────────────────────────────────────

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })

    setLoading(false)

    if (error) {
      setError(
        error.message === 'Signups not allowed for otp'
          ? 'Este correo no está registrado en Brocha.'
          : 'Error al enviar el código. Intenta de nuevo.'
      )
      return
    }

    setCode(['', '', '', '', '', ''])
    setStep('otp')
  }

  // ── Step 2: Verify OTP ───────────────────────────────────────────

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError(null)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const full = [...newCode.slice(0, 5), digit].join('')
      if (full.length === 6) verifyCode(full)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      setError(null)
      verifyCode(pasted)
    }
  }

  async function verifyCode(fullCode: string) {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: fullCode,
      type: 'email',
    })

    if (error) {
      setError('Código incorrecto o expirado. Intenta de nuevo.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setLoading(false)
      return
    }

    router.push('/portal')
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  const fullCode = code.join('')

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="auth-screen">
      <div className="auth-card">

        <div className="auth-logo">
          <img src="/brocha-logo.svg" alt="Brocha" style={{ height: 52, width: 'auto' }} />
        </div>

        {step === 'email' ? (
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
                <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>
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
            <h1 className="auth-title">Ingresa tu código</h1>
            <p className="auth-sub">
              Enviamos un código de 6 dígitos a{' '}
              <strong style={{ color: 'var(--dim)' }}>{email}</strong>.
            </p>

            <div className="otp-inputs" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  className={`otp-digit${error ? ' otp-error' : ''}`}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                />
              ))}
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="btn btn-yellow"
              style={{ width: '100%', marginTop: 16 }}
              disabled={fullCode.length < 6 || loading}
              onClick={() => verifyCode(fullCode)}
            >
              {loading ? 'Verificando...' : 'Verificar código →'}
            </button>

            <div className="auth-resend">
              {resent ? (
                <span style={{ color: 'var(--yellow)' }}>✓ Código reenviado</span>
              ) : (
                <>
                  ¿No recibiste el código?{' '}
                  <button
                    className="auth-resend-btn"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Enviando...' : 'Reenviar'}
                  </button>
                </>
              )}
            </div>

            <div className="auth-resend" style={{ marginTop: 4 }}>
              <button
                className="auth-resend-btn"
                onClick={() => { setStep('email'); setError(null); setCode(['','','','','','']) }}
              >
                ← Cambiar correo
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
