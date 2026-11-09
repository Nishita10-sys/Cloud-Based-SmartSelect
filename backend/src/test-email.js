
import 'dotenv/config'
import { sendEmail } from './services/emailService.js'

async function testEmail() {
  try {
    const result = await sendEmail({
      to: process.env.TEST_EMAIL_TO,
      subject: 'SmartSelect - Email Integration Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>SmartSelect Email Test</h2>
          <p>Your Resend email integration is working successfully!</p>
          <p>We are now ready to implement OTP authentication.</p>
        </div>
      `,
    })

    console.log(result)
  } catch (error) {
    console.error('Test failed:', error.message)
    process.exitCode = 1
  }
}

testEmail()
