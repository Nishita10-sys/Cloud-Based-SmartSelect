
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { supabase } from '../config/supabase.js'
import { findAccountByIdentifier } from '../services/accountLookupService.js'
import { verifyOtp } from '../services/otpService.js'

const verifyOtpSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  otp: z.string().regex(/^\d{6}$/),
})

const setPasswordSchema = z.object({
  password: z.string().min(12).max(128),
})

function getBearerToken(req) {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice(7).trim() || null
}

// STEP 1: Verify activation OTP
export async function verifyActivationOtp(req, res) {
  const validation = verifyOtpSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid login ID and six-digit OTP.',
    })
  }

  try {
    if (!process.env.ACTIVATION_TOKEN_SECRET) {
      throw new Error('Activation token configuration is missing.')
    }

    const { identifier, otp } = validation.data
    const lookup = await findAccountByIdentifier(identifier)

    if (
      !lookup.found ||
      !['student', 'faculty'].includes(lookup.account.accountType) ||
      lookup.account.profile.account_status !== 'pending' ||
      lookup.account.profile.force_password_change !== true
    ) {
      return res.status(403).json({
        success: false,
        message: 'This account cannot be activated.',
      })
    }

    const result = await verifyOtp({
      loginIdentifier: identifier,
      otp,
      purpose: 'activation',
    })

    const activationToken = jwt.sign(
      {
        loginIdentifier: identifier,
        purpose: 'account_activation',
        challengeId: result.challengeId,
      },
      process.env.ACTIVATION_TOKEN_SECRET,
      {
        subject: lookup.account.profile.id,
        expiresIn: '10m',
        issuer: 'smartselect-api',
        audience: 'smartselect-activation',
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        activationToken,
        nextStep: 'set_password',
        expiresInSeconds: 600,
      },
    })
  } catch (error) {
    console.error('Activation OTP verification error:', error.message)

    if (
      error.message.includes('OTP') ||
      error.message.includes('Invalid or expired')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return res.status(503).json({
      success: false,
      message: 'Unable to verify the code right now. Please try again.',
    })
  }
}

// STEP 2: Set permanent password and activate account
export async function setActivationPassword(req, res) {
  const validation = setPasswordSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain between 12 and 128 characters.',
    })
  }

  const activationToken = getBearerToken(req)

  if (!activationToken) {
    return res.status(401).json({
      success: false,
      message: 'Activation token is required.',
    })
  }

  try {
    if (!process.env.ACTIVATION_TOKEN_SECRET) {
      throw new Error('Activation token configuration is missing.')
    }

    const decoded = jwt.verify(
      activationToken,
      process.env.ACTIVATION_TOKEN_SECRET,
      {
        issuer: 'smartselect-api',
        audience: 'smartselect-activation',
      }
    )

    const tokenData = z.object({
      sub: z.string().uuid(),
      loginIdentifier: z.string().min(1),
      purpose: z.literal('account_activation'),
      challengeId: z.string().uuid(),
    }).safeParse(decoded)

    if (!tokenData.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid activation token.',
      })
    }

    const {
      sub: userId,
      loginIdentifier,
      challengeId,
    } = tokenData.data

    const lookup = await findAccountByIdentifier(loginIdentifier)

    if (
      !lookup.found ||
      lookup.account.profile.id !== userId ||
      !['student', 'faculty'].includes(lookup.account.accountType)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Account activation is not permitted.',
      })
    }

    const profile = lookup.account.profile

    if (
      profile.account_status !== 'pending' ||
      profile.force_password_change !== true
    ) {
      return res.status(409).json({
        success: false,
        message: 'This account has already been activated or is unavailable.',
      })
    }

    // Atomically claim the exact verified OTP challenge.
    // Only one request can successfully consume it.
    const now = new Date().toISOString()

    const { data: claimedChallenge, error: claimError } =
      await supabase
        .from('auth_challenges')
        .update({
          consumed_at: now,
        })
        .eq('id', challengeId)
        .eq('login_identifier', loginIdentifier)
        .eq('purpose', 'activation')
        .not('verified_at', 'is', null)
        .is('consumed_at', null)
        .gt('expires_at', now)
        .select('id')
        .maybeSingle()

    if (claimError || !claimedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'This verification has expired or has already been used. Please start activation again.',
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
        message: 'Password update failed. Please restart activation to request a new verification code.',
      })
    }

    // Activate only the matching pending profile.
    const { data: activatedProfile, error: activationError } =
      await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          force_password_change: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('account_status', 'pending')
        .eq('force_password_change', true)
        .select('id')
        .maybeSingle()

    if (activationError || !activatedProfile) {
      console.error(
        'Profile activation error:',
        activationError?.message || 'Profile was not updated.'
      )

      return res.status(500).json({
        success: false,
        message: 'Password was updated, but account activation needs administrative assistance.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Your password has been set and your account is now active. Please log in.',
      data: {
        accountActivated: true,
        nextStep: 'login',
      },
    })
  } catch (error) {
    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Activation token is invalid or expired. Please start again.',
      })
    }

    console.error('Password activation error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to complete account activation.',
    })
  }
}
