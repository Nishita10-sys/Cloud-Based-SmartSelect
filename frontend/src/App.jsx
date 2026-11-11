
import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import './App.css'
import authService from './services/authService'

function App() {
  const [screen, setScreen] = useState('login')

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')

  const [activationToken, setActivationToken] = useState('')
  const [resetToken, setResetToken] = useState('')

  const [profile, setProfile] = useState(null)

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
  }

  const clearMessage = () => {
    setMessage('')
    setMessageType('info')
  }

  const getErrorMessage = (error) => {
    return (
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.'
    )
  }

  const changeScreen = (nextScreen) => {
    setScreen(nextScreen)
    clearMessage()
    setOtp('')
    setPassword('')
    setConfirmPassword('')
    setIsPasswordVisible(false)
  }

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault()

    setIsLoading(true)
    clearMessage()

    try {
      const result = await authService.login(identifier.trim(), password)

      if (result.activationRequired) {
        changeScreen('activationOtp')

        showMessage(
          'Your account requires first-time activation. Check your registered university email for the OTP.'
        )

        return
      }

      if (!result.data?.accessToken) {
        throw new Error('Login response did not contain an access token.')
      }

      const userResult = await authService.getCurrentUser()

      setProfile(userResult.data)
      changeScreen('dashboard')

    } catch (error) {
      authService.clearSession()
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // VERIFY FIRST-TIME ACTIVATION OTP
  const handleActivationOtp = async (e) => {
    e.preventDefault()

    setIsLoading(true)
    clearMessage()

    try {
      const result = await authService.verifyActivationOtp(
        identifier.trim(),
        otp.trim()
      )

      setActivationToken(result.data.activationToken)

      changeScreen('activationPassword')

      showMessage('Email verified successfully. Create your permanent password.', 'success')

    } catch (error) {
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // SET FIRST PERMANENT PASSWORD
  const handleActivationPassword = async (e) => {
    e.preventDefault()

    if (password.length < 12) {
      showMessage('Your password must contain at least 12 characters.', 'error')
      return
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', 'error')
      return
    }

    setIsLoading(true)
    clearMessage()

    try {
      await authService.setActivationPassword(
        activationToken,
        password
      )

      setActivationToken('')
      setPassword('')
      setConfirmPassword('')

      changeScreen('login')

      showMessage(
        'Your account is now activated. Please sign in using your new password.',
        'success'
      )

    } catch (error) {
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // REQUEST PASSWORD RESET OTP
  const handleForgotPassword = async (e) => {
    e.preventDefault()

    setIsLoading(true)
    clearMessage()

    try {
      await authService.requestPasswordReset(identifier.trim())

      changeScreen('resetOtp')

      showMessage(
        'If an eligible account matches your details, a verification code will be sent to its registered email.'
      )

    } catch (error) {
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // VERIFY PASSWORD RESET OTP
  const handleResetOtp = async (e) => {
    e.preventDefault()

    setIsLoading(true)
    clearMessage()

    try {
      const result = await authService.verifyPasswordResetOtp(
        identifier.trim(),
        otp.trim()
      )

      setResetToken(result.resetToken)

      changeScreen('resetPassword')

      showMessage('Email verification successful. Create your new password.', 'success')

    } catch (error) {
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // COMPLETE PASSWORD RESET
  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (password.length < 12) {
      showMessage('Your password must contain at least 12 characters.', 'error')
      return
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', 'error')
      return
    }

    setIsLoading(true)
    clearMessage()

    try {
      await authService.completePasswordReset(
        resetToken,
        password
      )

      setResetToken('')
      setPassword('')
      setConfirmPassword('')

      changeScreen('login')

      showMessage(
        'Password changed successfully. Please sign in with your new password.',
        'success'
      )

    } catch (error) {
      showMessage(getErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // LOGOUT
  const handleLogout = async () => {
    setIsLoading(true)

    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
      authService.clearSession()
    } finally {
      setProfile(null)
      setIdentifier('')
      setPassword('')
      changeScreen('login')
      setIsLoading(false)
    }
  }

  const isPasswordScreen =
    screen === 'activationPassword' ||
    screen === 'resetPassword'

  const heading = {
    login: {
      eyebrow: 'WELCOME BACK',
      title: 'Sign in to SmartSelect',
      description: 'Access your university account to continue.',
    },
    activationOtp: {
      eyebrow: 'ACCOUNT ACTIVATION',
      title: 'Verify your email',
      description: 'Enter the verification code sent to your registered university email.',
    },
    activationPassword: {
      eyebrow: 'ACCOUNT ACTIVATION',
      title: 'Create your password',
      description: 'Set a new permanent password for your university account.',
    },
    forgot: {
      eyebrow: 'ACCOUNT RECOVERY',
      title: 'Forgot password?',
      description: 'Enter your university ID or Admin email to begin account recovery.',
    },
    resetOtp: {
      eyebrow: 'ACCOUNT RECOVERY',
      title: 'Verify your email',
      description: 'Enter the verification code sent to your registered email.',
    },
    resetPassword: {
      eyebrow: 'ACCOUNT RECOVERY',
      title: 'Set a new password',
      description: 'Create a new permanent password for your account.',
    },
    dashboard: {
      eyebrow: 'AUTHENTICATION SUCCESSFUL',
      title: 'Welcome to SmartSelect',
      description: 'Your university account is authenticated.',
    },
  }[screen]

  return (
    <main className="login-page">
      <section className="login-layout">

        {/* LEFT BRANDING PANEL */}

        <div className="brand-panel">
          <div className="brand-content">

            <div className="university-brand">
              <div className="brand-icon">
                <GraduationCap size={29} />
              </div>

              <div>
                <h2>SmartSelect</h2>
                <span>MIT ADT UNIVERSITY</span>
              </div>
            </div>

            <div className="brand-message">

              <span className="eyebrow">
                <Sparkles size={14} />
                UNIVERSITY ELECTIVE PORTAL
              </span>

              <h1>
                Your academic journey.
                <span> Your choices.</span>
              </h1>

              <p>
                Discover opportunities, explore electives, and take
                control of your academic experience through one
                unified university platform.
              </p>

              <div className="brand-features">

                <div className="feature-item">
                  <div className="feature-icon">
                    <GraduationCap size={19} />
                  </div>

                  <div>
                    <strong>Student-focused</strong>
                    <span>Explore and select your electives.</span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">
                    <UserRound size={19} />
                  </div>

                  <div>
                    <strong>Faculty workspace</strong>
                    <span>Manage courses and academic activities.</span>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <strong>Secure access</strong>
                    <span>A unified platform for the university.</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="brand-footer">
              <span>MIT Art, Design and Technology University</span>
              <span>Pune, Maharashtra</span>
            </div>

          </div>

          <div className="brand-decoration decoration-one" />
          <div className="brand-decoration decoration-two" />
        </div>

        {/* RIGHT FORM PANEL */}

        <div className="form-panel">
          <div className="form-container">

            <div className="mobile-brand">
              <GraduationCap size={25} />
              <span>SmartSelect</span>
            </div>

            <div className="form-heading">

              <div className="welcome-icon">
                {screen === 'forgot' ||
                screen === 'resetPassword' ||
                screen === 'activationPassword'
                  ? <LockKeyhole size={23} />
                  : screen === 'activationOtp' ||
                    screen === 'resetOtp'
                    ? <Mail size={23} />
                    : <UserRound size={23} />
                }
              </div>

              <span className="form-eyebrow">
                {heading.eyebrow}
              </span>

              <h2>{heading.title}</h2>

              <p>{heading.description}</p>

            </div>

            {/* LOGIN */}

            {screen === 'login' && (
              <form className="login-form" onSubmit={handleLogin}>

                <div className="input-group">
                  <label htmlFor="identifier">
                    University ID or Admin Email
                  </label>

                  <div className="input-wrapper">
                    <UserRound size={19} />

                    <input
                      id="identifier"
                      type="text"
                      placeholder="Enter your ID or email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value)
                        clearMessage()
                      }}
                      required
                    />
                  </div>

                  <span className="input-hint">
                    Student: Enrollment Number · Faculty: Employee ID
                  </span>
                </div>

                <div className="input-group">

                  <div className="label-row">
                    <label htmlFor="password">Password</label>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        changeScreen('forgot')
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="input-wrapper">
                    <LockKeyhole size={19} />

                    <input
                      id="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        clearMessage()
                      }}
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      aria-label={
                        isPasswordVisible ? 'Hide password' : 'Show password'
                      }
                    >
                      {isPasswordVisible
                        ? <EyeOff size={19} />
                        : <Eye size={19} />
                      }
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="status-message" role="status" aria-live="polite">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

              </form>
            )}

            {/* ACTIVATION OTP */}

            {screen === 'activationOtp' && (
              <form className="login-form" onSubmit={handleActivationOtp}>

                <div className="input-group">
                  <label htmlFor="activationOtp">Email verification code</label>

                  <div className="input-wrapper">
                    <Mail size={19} />

                    <input
                      id="activationOtp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                        clearMessage()
                      }}
                      required
                    />
                  </div>

                  <span className="input-hint">
                    The verification code expires in 5 minutes.
                  </span>
                </div>

                {message && (
                  <div className="status-message" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify email'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={() => changeScreen('login')}
                >
                  <ArrowLeft size={17} />
                  Back to sign in
                </button>

              </form>
            )}

            {/* ACTIVATION PASSWORD AND RESET PASSWORD */}

            {isPasswordScreen && (
              <form
                className="login-form"
                onSubmit={
                  screen === 'activationPassword'
                    ? handleActivationPassword
                    : handleResetPassword
                }
              >

                <div className="input-group">
                  <label htmlFor="newPassword">New password</label>

                  <div className="input-wrapper">
                    <LockKeyhole size={19} />

                    <input
                      id="newPassword"
                      type={isPasswordVisible ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        clearMessage()
                      }}
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      aria-label={
                        isPasswordVisible ? 'Hide password' : 'Show password'
                      }
                    >
                      {isPasswordVisible
                        ? <EyeOff size={19} />
                        : <Eye size={19} />
                      }
                    </button>
                  </div>

                  <span className="input-hint">
                    Use at least 12 characters.
                  </span>
                </div>

                <div className="input-group">
                  <label htmlFor="confirmPassword">
                    Confirm new password
                  </label>

                  <div className="input-wrapper">
                    <LockKeyhole size={19} />

                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearMessage()
                      }}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {message && (
                  <div className="status-message" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save password'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

              </form>
            )}

            {/* FORGOT PASSWORD */}

            {screen === 'forgot' && (
              <form className="login-form" onSubmit={handleForgotPassword}>

                <div className="input-group">
                  <label htmlFor="recoveryIdentifier">
                    University ID or Admin Email
                  </label>

                  <div className="input-wrapper">
                    <UserRound size={19} />

                    <input
                      id="recoveryIdentifier"
                      type="text"
                      placeholder="Enter your ID or email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value)
                        clearMessage()
                      }}
                      required
                    />
                  </div>

                  <span className="input-hint">
                    Student: Enrollment Number · Faculty: Employee ID · Admin: Email
                  </span>
                </div>

                {message && (
                  <div className="status-message" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Continue'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={() => changeScreen('login')}
                >
                  <ArrowLeft size={17} />
                  Back to sign in
                </button>

              </form>
            )}

            {/* PASSWORD RESET OTP */}

            {screen === 'resetOtp' && (
              <form className="login-form" onSubmit={handleResetOtp}>

                <div className="input-group">
                  <label htmlFor="resetOtp">Email verification code</label>

                  <div className="input-wrapper">
                    <Mail size={19} />

                    <input
                      id="resetOtp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                        clearMessage()
                      }}
                      required
                    />
                  </div>

                  <span className="input-hint">
                    The verification code expires in 5 minutes.
                  </span>
                </div>

                {message && (
                  <div className="status-message" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={() => changeScreen('forgot')}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

              </form>
            )}

            {/* AUTHENTICATED PLACEHOLDER */}

            {screen === 'dashboard' && (
              <div className="login-form">

                <div className="status-message" role="status">
                  You are successfully signed in.
                </div>

                <div className="input-group">
                  <label>Account name</label>
                  <p>{profile?.name || 'University User'}</p>
                </div>

                <div className="input-group">
                  <label>Account email</label>
                  <p>{profile?.email || 'Not available'}</p>
                </div>

                <div className="input-group">
                  <label>Account role</label>
                  <p>{profile?.role || 'Not available'}</p>
                </div>

                <button
                  type="button"
                  className="submit-button"
                  onClick={handleLogout}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing out...' : 'Sign out'}
                  {!isLoading && <ArrowRight size={19} />}
                </button>

              </div>
            )}

            <div className="security-note">
              <ShieldCheck size={17} />
              <span>Secure university account access</span>
            </div>

            <div className="form-bottom">
              <span>SmartSelect · MIT ADT University</span>
              <span>© 2026 All rights reserved</span>
            </div>

          </div>
        </div>

      </section>
    </main>
  )
}

export default App
