import 'dotenv/config'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'
import { findAccountByIdentifier } from '../services/accountLookupService.js'
import { issueOtp, verifyOtp } from '../services/otpService.js'

const RESET_TOKEN_ISSUER = 'smartselect-api'
const RESET_TOKEN_AUDIENCE = 'smartselect-password-reset'
const RESET_TOKEN_EXPIRY = '10m'

const genericMessage =
  'If an eligible account matches the details, a verification code will be sent to its registered email.'

function getIdentifier(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isEligibleAccount(account) {
  return (
    account &&
    ['student', 'faculty', 'admin'].includes(account.accountType) &&
    account.profile?.account_status === 'active' &&
    Boolean(account.profile?.email)
  )
}

// STEP 1: Request password-reset OTP
export async function requestPasswordReset(req, res) {
  try {
    const schema = z.object({
      identifier: z.string().trim().min(1).max(254),
    })

    const validation = schema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid login identifier.',
      })
    }

    const identifier = getIdentifier(validation.data.identifier)

    const lookup = await findAccountByIdentifier(identifier)

    if (!lookup.found || !isEligibleAccount(lookup.account)) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      })
    }

    await issueOtp({
      loginIdentifier: identifier,
      email: lookup.account.profile.email,
      purpose: 'password_reset',
    })

    return res.status(200).json({
      success: true,
      message: genericMessage,
    })
  } catch (error) {
    console.error('Password reset request error:', error.message)

    return res.status(503).json({
      success: false,
      message: 'Unable to process the request right now. Please try again later.',
    })
  }
}

// STEP 2: Verify password-reset OTP
export async function verifyPasswordResetOtp(req, res) {
  try {
    const schema = z.object({
      identifier: z.string().trim().min(1).max(254),
      otp: z.string().regex(/^\d{6}$/),
    })

    const validation = schema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid identifier and six-digit OTP.',
      })
    }

    if (!process.env.PASSWORD_RESET_TOKEN_SECRET) {
      throw new Error('PASSWORD_RESET_TOKEN_SECRET is not configured.')
    }

    const identifier = getIdentifier(validation.data.identifier)

    const lookup = await findAccountByIdentifier(identifier)

    if (!lookup.found || !isEligibleAccount(lookup.account)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.',
      })
    }

    const verification = await verifyOtp({
      loginIdentifier: identifier,
      otp: validation.data.otp,
      purpose: 'password_reset',
    })

    const resetToken = jwt.sign(
      {
        loginIdentifier: identifier,
        purpose: 'password_reset',
        challengeId: verification.challengeId,
      },
      process.env.PASSWORD_RESET_TOKEN_SECRET,
      {
        subject: lookup.account.profile.id,
        expiresIn: RESET_TOKEN_EXPIRY,
        issuer: RESET_TOKEN_ISSUER,
        audience: RESET_TOKEN_AUDIENCE,
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Verification successful. You can now set a new password.',
      resetToken,
      nextStep: 'set_new_password',
      expiresIn: 600,
    })
  } catch (error) {
    console.error('Password reset OTP verification error:', error.message)

    if (
      error.message?.toLowerCase().includes('otp') ||
      error.message?.toLowerCase().includes('invalid') ||
      error.message?.toLowerCase().includes('expired')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.',
      })
    }

    return res.status(503).json({
      success: false,
      message: 'Unable to verify the code right now. Please try again.',
    })
  }
}

// STEP 3: Complete password reset
export async function completePasswordReset(req, res) {
  try {
    const schema = z.object({
      password: z.string().min(12).max(128),
    })

    const validation = schema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain between 12 and 128 characters.',
      })
    }

    if (!process.env.PASSWORD_RESET_TOKEN_SECRET) {
      throw new Error('PASSWORD_RESET_TOKEN_SECRET is not configured.')
    }

    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'A valid password-reset token is required.',
      })
    }

    const resetToken = authorization.slice(7).trim()

    let decoded

    try {
      decoded = jwt.verify(
        resetToken,
        process.env.PASSWORD_RESET_TOKEN_SECRET,
        {
          issuer: RESET_TOKEN_ISSUER,
          audience: RESET_TOKEN_AUDIENCE,
        }
      )
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired password-reset token.',
      })
    }

    const tokenSchema = z.object({
      sub: z.string().uuid(),
      loginIdentifier: z.string().min(1),
      purpose: z.literal('password_reset'),
      challengeId: z.string().uuid(),
    })

    const tokenValidation = tokenSchema.safeParse(decoded)

    if (!tokenValidation.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password-reset token.',
      })
    }

    const {
      sub: userId,
      loginIdentifier,
      challengeId,
    } = tokenValidation.data

    const lookup = await findAccountByIdentifier(loginIdentifier)

    if (
      !lookup.found ||
      !isEligibleAccount(lookup.account) ||
      lookup.account.profile.id !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'This password-reset request is no longer valid.',
      })
    }

    // Claim this exact verified OTP challenge so it cannot be reused.
    const now = new Date().toISOString()

    const { data: claimedChallenge, error: claimError } = await supabase
      .from('auth_challenges')
      .update({
        consumed_at: now,
      })
      .eq('id', challengeId)
      .eq('login_identifier', loginIdentifier)
      .eq('purpose', 'password_reset')
      .not('verified_at', 'is', null)
      .is('consumed_at', null)
      .gt('expires_at', now)
      .select('id')
      .maybeSingle()

    if (claimError) {
      console.error('Password reset challenge error:', claimError.message)
      throw new Error('Unable to validate password-reset challenge.')
    }

    if (!claimedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'This password-reset request has expired or was already used. Please request a new code.',
      })
    }

    // Update the password in Supabase Auth.
    const { error: passwordError } =
      await supabase.auth.admin.updateUserById(userId, {
        password: validation.data.password,
      })

    if (passwordError) {
      console.error('Password update error:', passwordError.message)

      return res.status(500).json({
        success: false,
        message: 'Unable to update the password. Please request a new verification code.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Your password has been changed successfully. Please log in with your new password.',
      nextStep: 'login',
    })
  } catch (error) {
    console.error('Password reset completion error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to complete password reset. Please try again.',
    })
  }
}