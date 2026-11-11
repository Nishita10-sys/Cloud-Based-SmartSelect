
import { z } from 'zod'

import { supabase } from '../config/supabase.js'
import { createSupabaseAuthClient } from '../config/supabaseAuth.js'

import { verifyCredentials } from '../services/credentialService.js'
import { findAccountByIdentifier } from '../services/accountLookupService.js'
import { issueOtp } from '../services/otpService.js'

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
})

function getBearerToken(req) {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice(7).trim() || null
}

// LOGIN
export async function login(req, res) {
  const validation = loginSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid login ID and password.',
    })
  }

  try {
    const credentials = await verifyCredentials(validation.data)

    if (credentials.activationRequired) {
      const lookup = await findAccountByIdentifier(
        validation.data.identifier
      )

      if (!lookup.found) {
        return res.status(401).json({
          success: false,
          message: 'Unable to continue account activation.',
        })
      }

      await issueOtp({
        loginIdentifier: validation.data.identifier.trim(),
        email: lookup.account.profile.email,
        purpose: 'activation',
      })

      return res.status(200).json({
        success: true,
        activationRequired: true,
        otpSent: true,
        message: 'A verification code has been sent to your registered email.',
        data: {
          userId: credentials.userId,
          role: credentials.accountType,
          nextStep: 'verify_activation_otp',
        },
      })
    }

    if (!credentials.session) {
      return res.status(500).json({
        success: false,
        message: 'Unable to establish a login session.',
      })
    }

    if (credentials.passwordChangeRequired) {
      return res.status(403).json({
        success: false,
        message: 'Password change is required. Please contact the administrator.',
      })
    }

    return res.status(200).json({
      success: true,
      activationRequired: false,
      message: 'Login successful.',
      data: {
        userId: credentials.userId,
        role: credentials.accountType,
        accessToken: credentials.session.access_token,
        refreshToken: credentials.session.refresh_token,
        expiresIn: credentials.session.expires_in,
        tokenType: credentials.session.token_type,
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)

    if (
      error.message === 'Unable to look up account.' ||
      error.message === 'Unable to deliver verification email.' ||
      error.message === 'Unable to create OTP challenge.' ||
      error.message === 'Unable to prepare OTP verification.'
    ) {
      return res.status(503).json({
        success: false,
        message: 'Authentication service is temporarily unavailable. Please try again.',
      })
    }

    if (error.message === 'Ambiguous account identifier.') {
      return res.status(409).json({
        success: false,
        message: 'Account identifier requires administrative review.',
      })
    }

    if (
      error.message === 'Account activation is not configured correctly.' ||
      error.message === 'Account role does not match its record.' ||
      error.message === 'Authentication account mismatch.'
    ) {
      return res.status(403).json({
        success: false,
        message: 'This account requires administrative review.',
      })
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid login credentials or unavailable account.',
    })
  }
}

// REFRESH ACCESS TOKEN
export async function refreshSession(req, res) {
  const validation = refreshSchema.safeParse(req.body)

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'A valid refresh token is required.',
    })
  }

  try {
    const authClient = createSupabaseAuthClient()

    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: validation.data.refreshToken,
    })

    if (error || !data?.user || !data?.session) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or expired. Please log in again.',
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, account_status, force_password_change')
      .eq('id', data.user.id)
      .maybeSingle()

    if (
      profileError ||
      !profile ||
      profile.account_status !== 'active' ||
      profile.force_password_change
    ) {
      await supabase.auth.admin.signOut(
        data.session.access_token,
        'local'
      )

      return res.status(403).json({
        success: false,
        message: 'This account is not permitted to refresh its session.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      data: {
        userId: profile.id,
        role: profile.role,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        tokenType: data.session.token_type,
      },
    })
  } catch (error) {
    console.error('Session refresh error:', error.message)

    return res.status(503).json({
      success: false,
      message: 'Unable to refresh session right now. Please try again.',
    })
  }
}

// LOGOUT
export async function logout(req, res) {
  try {
    const accessToken = getBearerToken(req)

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      })
    }

    const { error } = await supabase.auth.admin.signOut(
      accessToken,
      'local'
    )

    if (error) {
      console.error('Logout error:', error.message)

      return res.status(503).json({
        success: false,
        message: 'Unable to end the session. Please try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    })
  } catch (error) {
    console.error('Logout error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to complete logout.',
    })
  }
}

// CURRENT AUTHENTICATED USER
export async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully.',
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  })
}
