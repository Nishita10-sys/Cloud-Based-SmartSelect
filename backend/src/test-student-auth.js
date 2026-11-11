import 'dotenv/config'
import { createSupabaseAuthClient } from './config/supabaseAuth.js'
import { findAccountByIdentifier } from './services/accountLookupService.js'

async function testStudentAuth() {
  try {
    const lookup = await findAccountByIdentifier('SS-TEST-0001')

    if (!lookup.found) {
      throw new Error('Student account not found.')
    }

    const email = lookup.account.profile.email

    const authClient = createSupabaseAuthClient()

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password: '+919876543210',
    })

    if (error) {
      console.log('Supabase Auth failed:', error.message)
      return
    }

    console.log('Supabase Auth successful!')
    console.log('Authenticated User ID:', data.user.id)
    console.log('Expected User ID:', lookup.account.profile.id)
    console.log('User IDs match:', data.user.id === lookup.account.profile.id)

    await authClient.auth.signOut({ scope: 'local' })
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testStudentAuth()