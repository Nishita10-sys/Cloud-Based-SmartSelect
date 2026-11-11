import { supabase } from '../config/supabase.js'

const PROFILE_FIELDS = `
  id,
  full_name,
  email,
  phone,
  role,
  account_status,
  force_password_change
`

export async function findAccountByIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('A valid login identifier is required.')
  }

  const normalizedIdentifier = identifier.trim()

  if (!normalizedIdentifier) {
    throw new Error('A valid login identifier is required.')
  }

  const normalizedEmail = normalizedIdentifier.toLowerCase()

  const [
    studentResult,
    facultyResult,
    adminResult,
  ] = await Promise.all([
    supabase
      .from('student_details')
      .select(`
        enrollment_number,
        profile:profiles!inner (${PROFILE_FIELDS})
      `)
      .eq('enrollment_number', normalizedIdentifier)
      .maybeSingle(),

    supabase
      .from('faculty_details')
      .select(`
        employee_id,
        profile:profiles!inner (${PROFILE_FIELDS})
      `)
      .eq('employee_id', normalizedIdentifier)
      .maybeSingle(),

    supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('email', normalizedEmail)
      .eq('role', 'admin')
      .maybeSingle(),
  ])

  if (studentResult.error || facultyResult.error || adminResult.error) {
    console.error('Account lookup database error:', {
      student: studentResult.error?.message,
      faculty: facultyResult.error?.message,
      admin: adminResult.error?.message,
    })

    throw new Error('Unable to look up account.')
  }

  const matches = []

  if (studentResult.data) {
    matches.push({
      accountType: 'student',
      profile: studentResult.data.profile,
    })
  }

  if (facultyResult.data) {
    matches.push({
      accountType: 'faculty',
      profile: facultyResult.data.profile,
    })
  }

  if (adminResult.data) {
    matches.push({
      accountType: 'admin',
      profile: adminResult.data,
    })
  }

  if (matches.length > 1) {
    throw new Error('Ambiguous account identifier.')
  }

  if (matches.length === 0) {
    return {
      found: false,
      account: null,
    }
  }

  const account = matches[0]

  if (account.profile.role !== account.accountType) {
    throw new Error('Account role does not match its record.')
  }

  return {
    found: true,
    account,
  }
}
