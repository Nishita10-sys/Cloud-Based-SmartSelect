import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { supabase } from '../config/supabase.js'
import { createSupabaseAuthClient } from '../config/supabaseAuth.js'
import { findAccountByIdentifier } from './accountLookupService.js'

function createActivationToken({ userId, accountType, identifier }) {
  const secret = process.env.ACTIVATION_TOKEN_SECRET

  if (!secret) {
    throw new Error('ACTIVATION_TOKEN_SECRET is not configured.')
  }

  return jwt.sign(
    {
      purpose: 'account_activation',
      role: accountType,
      identifier,
    },
    secret,
    {
      subject: userId,
      expiresIn: '10m',
      issuer: 'smartselect-api',
      audience: 'smartselect-activation',
      jwtid: randomUUID(),
    }
  )
}

export async function verifyCredentials({ identifier, password }) {
  if (
    typeof identifier !== 'string' ||
    typeof password !== 'string' ||
    !identifier.trim() ||
    !password
  ) {
    throw new Error('Identifier and password are required.')
  }

  const normalizedIdentifier = identifier.trim()
  const lookup = await findAccountByIdentifier(normalizedIdentifier)

  if (!lookup.found) {
    throw new Error('Invalid login credentials.')
  }

  const { accountType, profile } = lookup.account

  if (!['active', 'pending'].includes(profile.account_status)) {
    throw new Error('This account is not available for login.')
  }

  if (
    profile.account_status === 'pending' &&
    (
      !['student', 'faculty'].includes(accountType) ||
      profile.force_password_change !== true
    )
  ) {
    throw new Error('Account activation is not configured correctly.')
  }

  const authClient = createSupabaseAuthClient()

  const { data, error } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password,
  })

  if (error || !data?.user || !data?.session) {
    throw new Error('Invalid login credentials.')
  }

  if (data.user.id !== profile.id) {
    await authClient.auth.signOut({ scope: 'local' })
    throw new Error('Authentication account mismatch.')
  }

  if (profile.account_status === 'pending') {
    const { error: revokeError } = await supabase.auth.admin.signOut(
      data.session.access_token,
      'local'
    )

    if (revokeError) {
      console.error('Pending session revocation failed:', revokeError.message)
      throw new Error('Unable to secure pending account session.')
    }

    const activationToken = createActivationToken({
      userId: profile.id,
      accountType,
      identifier: normalizedIdentifier,
    })

    return {
      authenticated: true,
      userId: profile.id,
      accountType,
      accountStatus: profile.account_status,
      activationRequired: true,
      passwordChangeRequired: true,
      activationToken,
      session: null,
    }
  }

  if (profile.force_password_change === true) {
    await authClient.auth.signOut({ scope: 'local' })
    throw new Error('Account activation is not configured correctly.')
  }

  return {
    authenticated: true,
    userId: profile.id,
    accountType,
    accountStatus: profile.account_status,
    activationRequired: false,
    passwordChangeRequired: false,
    session: data.session,
  }
}