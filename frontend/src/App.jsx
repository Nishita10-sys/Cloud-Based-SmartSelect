
import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  ArrowLeft,
} from 'lucide-react'
import './App.css'

function App() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    setMessage('Authentication is not connected yet. Your login interface is ready.')
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setMessage('Password reset will be available after backend integration.')
  }

  return (
    <main className="login-page">
      <section className="login-layout">

        {/* Left branding section */}
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

        {/* Right login section */}
        <div className="form-panel">
          <div className="form-container">

            <div className="mobile-brand">
              <GraduationCap size={25} />
              <span>SmartSelect</span>
            </div>

            <div className="form-heading">
              <div className="welcome-icon">
                {isForgotPassword ? <LockKeyhole size={23} /> : <UserRound size={23} />}
              </div>

              <span className="form-eyebrow">
                {isForgotPassword ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}
              </span>

              <h2>
                {isForgotPassword ? 'Forgot password?' : 'Sign in to SmartSelect'}
              </h2>

              <p>
                {isForgotPassword
                  ? 'Enter your registered university email to begin account recovery.'
                  : 'Access your university account to continue.'}
              </p>
            </div>

            {!isForgotPassword ? (
              <form className="login-form" onSubmit={handleLogin}>
                <div className="input-group">
                  <label htmlFor="identifier">University ID or Admin Email</label>
                  <div className="input-wrapper">
                    <UserRound size={19} />
                    <input
                      id="identifier"
                      type="text"
                      placeholder="Enter your ID or email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value)
                        setMessage('')
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
                        setIsForgotPassword(true)
                        setMessage('')
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
                        setMessage('')
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                      {isPasswordVisible ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                {message && <div className="status-message">{message}</div>}

                <button type="submit" className="submit-button">
                  Sign in
                  <ArrowRight size={19} />
                </button>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleForgotPassword}>
                <div className="input-group">
                  <label htmlFor="email">Registered University Email</label>
                  <div className="input-wrapper">
                    <Mail size={19} />
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setMessage('')
                      }}
                      required
                    />
                  </div>
                  <span className="input-hint">
                    An OTP will be sent to your registered email.
                  </span>
                </div>

                {message && <div className="status-message">{message}</div>}

                <button type="submit" className="submit-button">
                  Continue
                  <ArrowRight size={19} />
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    setIsForgotPassword(false)
                    setMessage('')
                  }}
                >
                  <ArrowLeft size={17} />
                  Back to sign in
                </button>
              </form>
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
