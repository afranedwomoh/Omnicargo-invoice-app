import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

type AuthMode = 'login' | 'signup' | 'forgot-password'

export const AuthContainer: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const handleModeChange = (mode: AuthMode) => setAuthMode(mode)

  return (
    <>
      {authMode === 'login' ? (
        <LoginForm 
          onToggleMode={() => handleModeChange('signup')} 
          onForgotPassword={() => handleModeChange('forgot-password')}
        />
      ) : authMode === 'signup' ? (
        <SignUpForm onToggleMode={() => handleModeChange('login')} />
      ) : (
        <ForgotPasswordForm onBackToLogin={() => handleModeChange('login')} />
      )}
    </>
  )
}
