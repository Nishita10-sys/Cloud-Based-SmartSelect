
import 'dotenv/config'
import { randomUUID } from 'crypto'
import { createInterface } from 'readline/promises'
import { stdin, stdout } from 'process'

import {
  issueOtp,
  verifyOtp,
  consumeVerifiedOtp,
} from './services/otpService.js'

const rl = createInterface({ input: stdin, output: stdout })

async function testOtp() {
  // A temporary identifier, not a real student or faculty ID.
  const loginIdentifier = `OTP-TEST-${randomUUID()}`

  try {
    if (!process.env.TEST_EMAIL_TO) {
      throw new Error('TEST_EMAIL_TO is missing from backend/.env')
    }

    console.log('\nSending test OTP...')

    await issueOtp({
      loginIdentifier,
      email: process.env.TEST_EMAIL_TO,
      purpose: 'activation',
    })

    console.log('OTP email sent successfully.')
    console.log('Check your inbox and spam folder.')

    const otp = await rl.question('\nEnter the 6-digit OTP: ')

    const result = await verifyOtp({
      loginIdentifier,
      otp: otp.trim(),
      purpose: 'activation',
    })

    console.log('\nOTP verification:', result.message)

    await consumeVerifiedOtp({
      loginIdentifier,
      purpose: 'activation',
    })

    console.log('OTP successfully consumed.')
    console.log('Test completed successfully!')
  } catch (error) {
    console.error('\nOTP test failed:', error.message)
    process.exitCode = 1
  } finally {
    rl.close()
  }
}

testOtp()
