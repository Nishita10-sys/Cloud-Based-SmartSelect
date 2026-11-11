import 'dotenv/config'
import crypto from 'crypto'
import { supabase } from '../config/supabase.js'
import { sendEmail } from './emailService.js'

const OTP_EXPIRY_MINUTES = 5
const MAX_OTP_ATTEMPTS = 5

const VALID_PURPOSES = ['activation', 'password_reset']

function hashOtp(otp, identifier, purpose) {
  const secret = process.env.OTP_HASH_SECRET

  if (!secret) {
    throw new Error('OTP_HASH_SECRET is not configured.')
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`${purpose}:${identifier}:${otp}`)
    .digest('hex')
}

function isValidPurpose(purpose) {
  return VALID_PURPOSES.includes(purpose)
}

export async function issueOtp({ loginIdentifier, email, purpose }) {
  if (!isValidPurpose(purpose)) {
    throw new Error('Invalid OTP purpose.')
  }

  if (
    typeof loginIdentifier !== 'string' ||
    typeof email !== 'string' ||
    !loginIdentifier.trim() ||
    !email.trim()
  ) {
    throw new Error('Login identifier and email are required.')
  }

  const identifier = loginIdentifier.trim()
  const recipient = email.trim().toLowerCase()

  const otp = crypto.randomInt(100000, 1000000).toString()
  const otpHash = hashOtp(otp, identifier, purpose)

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  // Invalidate previous unused challenges for this identifier and purpose.
  const { error: invalidateError } = await supabase
    .from('auth_challenges')
    .update({ consumed_at: now.toISOString() })
    .eq('login_identifier', identifier)
    .eq('purpose', purpose)
    .is('consumed_at', null)

  if (invalidateError) {
    throw new Error('Unable to prepare OTP verification.')
  }

  const { data: challenge, error: insertError } = await supabase
    .from('auth_challenges')
    .insert({
      login_identifier: identifier,
      otp_hash: otpHash,
      purpose,
      expires_at: expiresAt,
      attempts: 0,
      delivery_email_status: 'pending',
      delivery_sms_status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('OTP database error:', insertError.message)
    throw new Error('Unable to create OTP challenge.')
  }

  try {
    const subject =
      purpose === 'activation'
        ? 'SmartSelect - Account Activation OTP'
        : 'SmartSelect - Password Reset OTP'

    await sendEmail({
      to: recipient,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #17243b;">
          <h2>SmartSelect</h2>
          <h3>Your verification code</h3>
          <p>Your SmartSelect verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 0;">
            ${otp}
          </div>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #64748b;">
            SmartSelect - MIT ADT University
          </p>
        </div>
      `,
    })

    const { error: updateError } = await supabase
      .from('auth_challenges')
      .update({ delivery_email_status: 'sent' })
      .eq('id', challenge.id)

    if (updateError) {
      throw new Error('Unable to update email delivery status.')
    }

    return {
      success: true,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    }
  } catch (error) {
    await supabase
      .from('auth_challenges')
      .update({
        delivery_email_status: 'failed',
        consumed_at: new Date().toISOString(),
      })
      .eq('id', challenge.id)

    console.error('OTP delivery failed:', error.message)
    throw new Error('Unable to deliver verification email.')
  }
}

export async function verifyOtp({
  loginIdentifier,
  otp,
  purpose,
}) {
  if (!isValidPurpose(purpose)) {
    throw new Error('Invalid OTP purpose.')
  }

  if (
    typeof loginIdentifier !== 'string' ||
    !/^\d{6}$/.test(String(otp))
  ) {
    throw new Error('Invalid or expired OTP.')
  }

  const identifier = loginIdentifier.trim()

  const { data: challenge, error } = await supabase
    .from('auth_challenges')
    .select('*')
    .eq('login_identifier', identifier)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !challenge) {
    throw new Error('Invalid or expired OTP.')
  }

  if (challenge.verified_at) {
    throw new Error('This OTP has already been verified.')
  }

  if (new Date(challenge.expires_at) <= new Date()) {
    throw new Error('OTP has expired. Please request a new one.')
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Maximum OTP attempts exceeded.')
  }

  const candidateHash = Buffer.from(
    hashOtp(String(otp), identifier, purpose),
    'hex'
  )

  const storedHash = Buffer.from(challenge.otp_hash, 'hex')

  const isMatch =
    candidateHash.length === storedHash.length &&
    crypto.timingSafeEqual(candidateHash, storedHash)

  if (!isMatch) {
    // Compare-and-update prevents concurrent requests from
    // overwriting each other's attempt counters.
    const { data: updated, error: attemptError } = await supabase
      .from('auth_challenges')
      .update({ attempts: challenge.attempts + 1 })
      .eq('id', challenge.id)
      .eq('attempts', challenge.attempts)
      .is('verified_at', null)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle()

    if (attemptError || !updated) {
      throw new Error('Invalid or expired OTP.')
    }

    throw new Error('Invalid or expired OTP.')
  }

  // Only one concurrent request can verify this challenge.
  const { data: verified, error: verifyError } = await supabase
    .from('auth_challenges')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', challenge.id)
    .eq('attempts', challenge.attempts)
    .is('verified_at', null)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .maybeSingle()

  if (verifyError || !verified) {
    throw new Error('Invalid or expired OTP.')
  }

  return {
    success: true,
    message: 'OTP verified successfully.',
    challengeId: verified.id,
  }
}

export async function consumeVerifiedOtp({
  loginIdentifier,
  purpose,
}) {
  if (!isValidPurpose(purpose)) {
    throw new Error('Invalid OTP purpose.')
  }

  if (
    typeof loginIdentifier !== 'string' ||
    !loginIdentifier.trim()
  ) {
    throw new Error('Login identifier is required.')
  }

  const identifier = loginIdentifier.trim()
  const now = new Date().toISOString()

  const { data: challenge, error } = await supabase
    .from('auth_challenges')
    .select('id')
    .eq('login_identifier', identifier)
    .eq('purpose', purpose)
    .not('verified_at', 'is', null)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !challenge) {
    throw new Error('Verified OTP not found or expired.')
  }

  // The conditional update ensures only one request consumes it.
  const { data: consumed, error: consumeError } = await supabase
    .from('auth_challenges')
    .update({ consumed_at: now })
    .eq('id', challenge.id)
    .is('consumed_at', null)
    .not('verified_at', 'is', null)
    .gt('expires_at', now)
    .select('id')
    .maybeSingle()

  if (consumeError || !consumed) {
    throw new Error('Unable to complete OTP verification.')
  }

  return { success: true }
}
