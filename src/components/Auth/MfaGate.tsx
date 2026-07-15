import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, LogOut, KeyRound } from 'lucide-react'

type GateStatus = 'checking' | 'needs-enroll' | 'needs-verify' | 'ready'

export const MfaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth()
  const [status, setStatus] = useState<GateStatus>('checking')
  const [factorId, setFactorId] = useState<string | null>(null)

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const checkStatus = async () => {
    setStatus('checking')
    setError('')

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError) {
      console.error('Error checking MFA assurance level:', aalError)
      setStatus('ready')
      return
    }

    if (aal.currentLevel === 'aal2') {
      setStatus('ready')
      return
    }

    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

    if (factorsError) {
      console.error('Error listing MFA factors:', factorsError)
      setStatus('ready')
      return
    }

    const verifiedTotp = factorsData.totp.find(f => f.status === 'verified')

    if (verifiedTotp) {
      setFactorId(verifiedTotp.id)
      setStatus('needs-verify')
    } else {
      await startEnrollment()
    }
  }

  const startEnrollment = async () => {
    const unverified = (await supabase.auth.mfa.listFactors()).data?.totp.find(f => f.status === 'unverified')
    if (unverified) {
      await supabase.auth.mfa.unenroll({ factorId: unverified.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

    if (error) {
      console.error('Error enrolling MFA factor:', error)
      setError('Could not start security setup. Please try signing out and back in.')
      setStatus('needs-enroll')
      return
    }

    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStatus('needs-enroll')
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || code.trim().length < 6) return

    setSubmitting(true)
    setError('')

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim()
      })
      if (verifyError) throw verifyError

      setCode('')
      await checkStatus()
    } catch (err: any) {
      console.error('MFA verification error:', err)
      setError(err?.message || 'Incorrect code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (status === 'ready') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-700 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-primary-100 rounded-full mx-auto mb-4">
            {status === 'needs-enroll' ? (
              <KeyRound className="w-7 h-7 text-primary-600" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-primary-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {status === 'needs-enroll' ? 'Set Up Security Verification' : 'Enter Your Security Code'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {status === 'needs-enroll'
              ? 'Every account is required to set up an authenticator app before continuing.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        {status === 'needs-enroll' && qrCode && (
          <div className="space-y-4">
            <div className="flex justify-center bg-gray-50 rounded-lg p-4">
              <img src={qrCode} alt="Scan with your authenticator app" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scan this with Google Authenticator, Authy, or Apple Passwords. Can't scan it? Enter this code manually:
            </p>
            {secret && (
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                <code className="text-sm font-mono text-gray-700 break-all">{secret}</code>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full text-center text-2xl tracking-[0.5em] font-mono px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting || code.trim().length < 6}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : status === 'needs-enroll' ? 'Confirm & Enable' : 'Verify'}
          </button>
        </form>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}
