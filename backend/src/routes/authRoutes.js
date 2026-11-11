import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import {
  login,
  refreshSession,
  logout,
  getCurrentUser,
} from '../controllers/authController.js'

import {
  verifyActivationOtp,
  setActivationPassword,
} from '../controllers/activationController.js'

import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  completePasswordReset,
} from '../controllers/passwordResetController.js'

import { authenticateUser } from '../middleware/authMiddleware.js'

const router = Router()

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
})

// Activation and OTP verification rate limiter
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.',
  },
})

// Password setup rate limiter
const passwordSetupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password setup attempts. Please try again later.',
  },
})

// Forgot password request limiter
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password-reset requests. Please try again later.',
  },
})

// Password-reset completion limiter
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password-reset attempts. Please try again later.',
  },
})

// Session refresh limiter
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

// Logout limiter
const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

// Authentication
router.post('/login', loginLimiter, login)

// First-time account activation
router.post('/activation/verify-otp', otpLimiter, verifyActivationOtp)
router.post('/activation/set-password', passwordSetupLimiter, setActivationPassword)

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, requestPasswordReset)
router.post('/reset-password/verify-otp', otpLimiter, verifyPasswordResetOtp)
router.post('/reset-password/complete', resetPasswordLimiter, completePasswordReset)

// Session management
router.post('/refresh', refreshLimiter, refreshSession)
router.post('/logout', authenticateUser, logoutLimiter, logout)
router.get('/me', authenticateUser, getCurrentUser)

export default router