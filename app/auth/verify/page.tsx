'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function VerifyForm() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const supabase = createClient()

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError(null)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === 5) {
      const fullCode = [...newCode.slice(0, 5), digit].join('')
      if (fullCode.length === 6) verifyCode(fullCode)
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
    if (!email) {
      setError('Correo no encontrado. Vuelve a /login.')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      email,
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

    // Session created — redirect to portal
    router.push('/portal')
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  const fullCode = code.join('')

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/brocha-logo.svg" alt="Brocha" style={{ height: 52, width: 'auto' }} />
        </div>

        <h1 className="auth-title">Ingresa tu código</h1>
        <p className="auth-sub">
          Enviamos un código de 6 dígitos a <strong>{email || 'tu correo'}</strong>.
        </p>

        {/* 6-digit input */}
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
          <a href="/login" className="auth-resend-btn">← Cambiar correo</a>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">brocha<span>.</span></div>
          <p className="auth-sub">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  )
}
