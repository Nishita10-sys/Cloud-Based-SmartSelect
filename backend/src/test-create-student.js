
import 'dotenv/config'
import { supabase } from './config/supabase.js'

const TEST_EMAIL = process.env.TEST_EMAIL_TO?.trim().toLowerCase()

// Test-only account details
const ENROLLMENT_NUMBER = 'SS-TEST-0001'
const TEMPORARY_PASSWORD = '+919876543210'

async function createTestStudent() {
  if (!TEST_EMAIL) {
    throw new Error('TEST_EMAIL_TO is missing from backend/.env')
  }

  // Prevent accidental duplicate test accounts.
  const { data: existingStudent, error: studentCheckError } =
    await supabase
      .from('student_details')
      .select('id')
      .eq('enrollment_number', ENROLLMENT_NUMBER)
      .maybeSingle()

  if (studentCheckError) {
    throw new Error(studentCheckError.message)
  }

  if (existingStudent) {
    throw new Error('This test enrollment number already exists.')
  }

  const { data: existingProfile, error: profileCheckError } =
    await supabase
      .from('profiles')
      .select('id')
      .eq('email', TEST_EMAIL)
      .maybeSingle()

  if (profileCheckError) {
    throw new Error(profileCheckError.message)
  }

  if (existingProfile) {
    throw new Error('A profile already exists for TEST_EMAIL_TO. Use a separate test email.')
  }

  // Create the Supabase Auth identity.
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEMPORARY_PASSWORD,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Unable to create test Auth user.')
  }

  const userId = authData.user.id
  const now = new Date().toISOString()

  try {
    // Create the matching profile.
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: 'SmartSelect Test Student',
        email: TEST_EMAIL,
        phone: TEMPORARY_PASSWORD,
        role: 'student',
        account_status: 'pending',
        force_password_change: true,
        created_at: now,
        updated_at: now,
      })

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    // Create the matching student record.
    const { error: detailsError } = await supabase
      .from('student_details')
      .insert({
        profile_id: userId,
        enrollment_number: ENROLLMENT_NUMBER,
        created_at: now,
        updated_at: now,
      })

    if (detailsError) {
      throw new Error(`Student record creation failed: ${detailsError.message}`)
    }

    console.log('\nTest student created successfully!')
    console.log('-----------------------------------')
    console.log('Enrollment Number:', ENROLLMENT_NUMBER)
    console.log('Temporary Password:', TEMPORARY_PASSWORD)
    console.log('Email:', TEST_EMAIL)
    console.log('Account Status: pending')
    console.log('Force Password Change: true')
    console.log('-----------------------------------')
    console.log('Auth User ID:', userId)
  } catch (error) {
    // Remove the partially created account if setup fails.
    const { error: rollbackError } =
      await supabase.auth.admin.deleteUser(userId)

    if (rollbackError) {
      console.error('Account cleanup failed:', rollbackError.message)
    }

    throw error
  }
}

createTestStudent().catch((error) => {
  console.error('\nTest student creation failed:', error.message)
  process.exitCode = 1
})
