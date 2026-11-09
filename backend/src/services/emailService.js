
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing from backend/.env')
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend email error:', error.message)
      throw new Error('Unable to send email.')
    }

    console.log('Email sent successfully:', data.id)

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error('Email service error:', error.message)
    throw error
  }
}
